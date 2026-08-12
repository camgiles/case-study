import numpy as np
import pandas as pd
import json
from pathlib import Path

RNG = np.random.default_rng(42)
OUT = Path(__file__).resolve().parent.parent / "data"
FIG = Path(__file__).resolve().parent.parent / "figures"
OUT.mkdir(exist_ok=True)
FIG.mkdir(exist_ok=True)

ASSUMPTIONS = {
    "power_mw": 100,                # nameplate power, MW
    "duration_hr": 4,                # hours of storage at rated power
    "energy_mwh": 400,               # power_mw * duration_hr
    "round_trip_efficiency": 0.86,   # typical utility-scale Li-ion BESS (NREL)
    "project_life_yr": 20,
    "capex_per_kwh": 340,            # $/kWh installed, mid-case current-year
    "bos_soft_costs_pct": 0.0,       # already embedded in $/kWh turnkey figure
    "fixed_om_per_kw_yr": 9.5,       # $/kW-yr fixed O&M (NREL ATB range 7-12)
    "variable_om_per_mwh": 2.0,      # $/MWh throughput
    "augmentation_yr": 10,           # year of major augmentation/replacement
    "augmentation_cost_pct": 0.35,   # % of original capex spent at year 10
    "annual_degradation_pct": 0.015, # 1.5%/yr energy-capacity fade
    "itc_pct": 0.30,
    "macrs_years": 7,                # MACRS class life for storage
    "discount_rate": 0.085,          # nominal after-tax WACC, merchant storage
    "tax_rate": 0.25,
    "avg_price_mwh": 28,             # annual average DA price, $/MWh
    "price_daily_amplitude": 18,     # diurnal swing amplitude, $/MWh
    "price_seasonal_amplitude": 10,  # summer/winter uplift, $/MWh
    "price_noise_std": 9,            # hourly noise, $/MWh
    "spike_prob": 0.006,             # probability/hour of a price spike event
    "spike_size_mean": 220,          # $/MWh mean spike add-on
    "negative_price_prob": 0.03,     # probability/hour of negative pricing
    "ancillary_revenue_share": 0.42, # AS as % of TOTAL fleet revenue (Tyba H1'25)
    "cycles_per_day": 1.3,           # effective full-equivalent-cycles/day
    "availability": 0.97,
}


def build_price_curve(assump=ASSUMPTIONS, hours=8760, seed=42):
    """Synthetic hourly ERCOT day-ahead price curve calibrated to 2025
    market statistics (mean, diurnal shape, seasonality, spike frequency,
    negative-price frequency)."""
    rng = np.random.default_rng(seed)
    t = np.arange(hours)
    hour_of_day = t % 24
    day_of_year = (t // 24) % 365

    diurnal = assump["price_daily_amplitude"] * np.sin(
        (hour_of_day - 8) / 24 * 2 * np.pi
    )
    seasonal = assump["price_seasonal_amplitude"] * np.cos(
        (day_of_year - 200) / 365 * 2 * np.pi
    )
    noise = rng.normal(0, assump["price_noise_std"], size=hours)
    price = assump["avg_price_mwh"] + diurnal + seasonal + noise

    spikes = rng.random(hours) < assump["spike_prob"]
    price[spikes] += rng.exponential(assump["spike_size_mean"], spikes.sum())

    neg = rng.random(hours) < assump["negative_price_prob"]
    price[neg] -= rng.uniform(5, 40, neg.sum())

    return pd.Series(price, name="price_mwh")


def simulate_dispatch_revenue(price, assump=ASSUMPTIONS):
    """Simple perfect-foresight daily arbitrage: charge the cheapest hours,
    discharge the priciest hours each day, subject to power/energy/efficiency
    limits."""
    power = assump["power_mw"]
    energy = assump["energy_mwh"]
    rte = assump["round_trip_efficiency"]
    hours_per_day = 24
    charge_hours = int(round(energy / power / np.sqrt(rte)))  # hrs to fill
    discharge_hours = charge_hours

    df = price.copy().to_frame()
    df["day"] = df.index // hours_per_day
    energy_rev = 0.0
    mwh_discharged_total = 0.0

    for _, day_prices in df.groupby("day")["price_mwh"]:
        sorted_idx = day_prices.sort_values()
        cheap = sorted_idx.iloc[:charge_hours]
        pricey = sorted_idx.iloc[-discharge_hours:]
        charge_cost = cheap.sum() * power
        discharge_rev = pricey.sum() * power * rte
        energy_rev += (discharge_rev - charge_cost)
        mwh_discharged_total += power * discharge_hours

    energy_rev *= assump["availability"]
    # Gross up so energy revenue represents its calibrated share of total
    # fleet revenue (energy = 1 - ancillary_revenue_share)
    energy_share = 1 - assump["ancillary_revenue_share"]
    total_revenue_yr1 = energy_rev / energy_share if energy_rev > 0 else energy_rev
    ancillary_rev = total_revenue_yr1 * assump["ancillary_revenue_share"]

    return {
        "energy_arbitrage_revenue": energy_rev,
        "ancillary_revenue": ancillary_rev,
        "total_revenue_yr1": total_revenue_yr1,
        "mwh_discharged": mwh_discharged_total,
    }


def macrs_schedule(years=7):
    tables = {
        7: [0.1429, 0.2449, 0.1749, 0.1249, 0.0893, 0.0892, 0.0893, 0.0446],
    }
    return tables.get(years, tables[7])


def run_financial_model(revenue_yr1, assump=ASSUMPTIONS):
    life = assump["project_life_yr"]
    capex = assump["capex_per_kwh"] * assump["energy_mwh"] * 1000  # $/kWh*kWh
    itc = capex * assump["itc_pct"]
    net_capex_cash = capex - itc  # ITC reduces cash outlay in yr0 (simplified)

    fixed_om_yr1 = assump["fixed_om_per_kw_yr"] * assump["power_mw"] * 1000
    var_om_yr1 = assump["variable_om_per_mwh"] * (
        assump["power_mw"] * 24 * 365 * assump["cycles_per_day"] / 6
    )  # approx MWh throughput

    macrs = macrs_schedule(assump["macrs_years"])
    depr_basis = capex - 0.5 * itc  # half-basis reduction, simplified convention

    rows = []
    cum_degr = 1.0
    for yr in range(0, life + 1):
        if yr == 0:
            rows.append({"year": 0, "revenue": 0, "opex": 0, "capex": net_capex_cash,
                         "depreciation": 0, "ebt": -net_capex_cash, "tax": 0,
                         "net_cf": -net_capex_cash})
            continue

        degr_factor = (1 - assump["annual_degradation_pct"]) ** (yr - 1)
        revenue = revenue_yr1 * degr_factor
        opex = (fixed_om_yr1 + var_om_yr1) * (1.02 ** (yr - 1))  # 2% opex escalation

        augmentation = 0.0
        if yr == assump["augmentation_yr"]:
            augmentation = capex * assump["augmentation_cost_pct"]

        depreciation = depr_basis * macrs[yr - 1] if yr - 1 < len(macrs) else 0
        ebt = revenue - opex - depreciation
        tax = max(ebt, 0) * assump["tax_rate"]
        net_cf = revenue - opex - augmentation - tax

        rows.append({
            "year": yr, "revenue": revenue, "opex": opex, "capex": augmentation,
            "depreciation": depreciation, "ebt": ebt, "tax": tax, "net_cf": net_cf,
        })

    cf = pd.DataFrame(rows)
    r = assump["discount_rate"]
    cf["discount_factor"] = 1 / (1 + r) ** cf["year"]
    cf["disc_cf"] = cf["net_cf"] * cf["discount_factor"]
    npv = cf["disc_cf"].sum()
    irr = np.irr(cf["net_cf"].values) if hasattr(np, "irr") else _irr(cf["net_cf"].values)

    cum = cf["net_cf"].cumsum()
    payback_yr = next((y for y, v in zip(cf["year"], cum) if v > 0), None)

    total_mwh_disc = assump["power_mw"] * 4 * 365 * assump["cycles_per_day"] * life
    total_cost_disc = (net_capex_cash + cf.loc[cf.year > 0, "opex"].sum()
                        + cf.loc[cf.year > 0, "capex"].sum())
    lcos = total_cost_disc / total_mwh_disc if total_mwh_disc else np.nan

    return {"cashflow": cf, "npv": npv, "irr": irr, "payback_yr": payback_yr,
            "lcos_per_mwh": lcos, "capex_gross": capex, "itc_value": itc}


def _irr(cashflows, guess=0.1):
    """Fallback IRR via Newton's method (numpy.irr removed in newer numpy)."""
    from scipy.optimize import brentq
    def npv_at(r):
        return sum(cf / (1 + r) ** i for i, cf in enumerate(cashflows))
    try:
        return brentq(npv_at, -0.99, 5.0)
    except Exception:
        return np.nan


def tornado_sensitivity(base_revenue, assump=ASSUMPTIONS, swing=0.20):
    """Vary key drivers +/- swing% and record NPV impact."""
    base = run_financial_model(base_revenue, assump)["npv"]
    drivers = {
        "Capex ($/kWh)": "capex_per_kwh",
        "Revenue (price/spread)": None,  # handled specially
        "Discount rate": "discount_rate",
        "Fixed O&M": "fixed_om_per_kw_yr",
        "Degradation rate": "annual_degradation_pct",
        "Augmentation cost": "augmentation_cost_pct",
    }
    results = []
    for label, key in drivers.items():
        a_lo, a_hi = dict(assump), dict(assump)
        if label == "Revenue (price/spread)":
            npv_lo = run_financial_model(base_revenue * (1 - swing), assump)["npv"]
            npv_hi = run_financial_model(base_revenue * (1 + swing), assump)["npv"]
        else:
            a_lo[key] = assump[key] * (1 - swing)
            a_hi[key] = assump[key] * (1 + swing)
            npv_lo = run_financial_model(base_revenue, a_lo)["npv"]
            npv_hi = run_financial_model(base_revenue, a_hi)["npv"]
        results.append({"driver": label, "npv_low": min(npv_lo, npv_hi),
                         "npv_high": max(npv_lo, npv_hi), "base_npv": base})
    return pd.DataFrame(results).sort_values(
        by=["npv_high"], key=lambda s: (s - base).abs(), ascending=False
    )


def monte_carlo(base_revenue, assump=ASSUMPTIONS, n=3000, seed=7):
    rng = np.random.default_rng(seed)
    npvs = []
    for _ in range(n):
        a = dict(assump)
        a["capex_per_kwh"] = base_revenue and rng.normal(assump["capex_per_kwh"], assump["capex_per_kwh"] * 0.12)
        a["discount_rate"] = max(0.03, rng.normal(assump["discount_rate"], 0.01))
        a["annual_degradation_pct"] = max(0.005, rng.normal(assump["annual_degradation_pct"], 0.004))
        rev_draw = base_revenue * rng.normal(1.0, 0.18)
        npvs.append(run_financial_model(max(rev_draw, 0), a)["npv"])
    npvs = np.array(npvs)
    return {
        "npvs": npvs,
        "p_positive": float((npvs > 0).mean()),
        "p10": float(np.percentile(npvs, 10)),
        "p50": float(np.percentile(npvs, 50)),
        "p90": float(np.percentile(npvs, 90)),
        "mean": float(npvs.mean()),
    }


if __name__ == "__main__":
    price = build_price_curve()
    price.to_csv(OUT / "synthetic_ercot_price_curve.csv", index=False)

    disp = simulate_dispatch_revenue(price)
    fin = run_financial_model(disp["total_revenue_yr1"])
    tornado = tornado_sensitivity(disp["total_revenue_yr1"])
    mc = monte_carlo(disp["total_revenue_yr1"])

    fin["cashflow"].to_csv(OUT / "cashflow_base_case.csv", index=False)
    tornado.to_csv(OUT / "tornado_sensitivity.csv", index=False)

    summary = {
        "assumptions": ASSUMPTIONS,
        "dispatch": disp,
        "npv": fin["npv"],
        "irr": fin["irr"],
        "payback_yr": fin["payback_yr"],
        "lcos_per_mwh": fin["lcos_per_mwh"],
        "capex_gross": fin["capex_gross"],
        "itc_value": fin["itc_value"],
        "monte_carlo": {k: v for k, v in mc.items() if k != "npvs"},
    }
    with open(OUT / "model_summary.json", "w") as f:
        json.dump(summary, f, indent=2, default=float)

    print(json.dumps(summary, indent=2, default=float))
