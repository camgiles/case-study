import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
import pandas as pd
from pathlib import Path
from battery_model import (build_price_curve, simulate_dispatch_revenue,
                            run_financial_model, tornado_sensitivity,
                            monte_carlo, ASSUMPTIONS)

FIG = Path(__file__).resolve().parent.parent / "figures"
FIG.mkdir(exist_ok=True)

# Simple, plain colors, nothing fancy
BLUE = "#4C72B0"
ORANGE = "#DD8452"
GREEN = "#55A868"
RED = "#C44E52"
GRAY = "#666666"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "axes.grid": True,
    "grid.linewidth": 0.5,
    "figure.facecolor": "white",
    "axes.facecolor": "white",
})

price = build_price_curve()
disp = simulate_dispatch_revenue(price)
fin = run_financial_model(disp["total_revenue_yr1"])
tornado = tornado_sensitivity(disp["total_revenue_yr1"])
mc = monte_carlo(disp["total_revenue_yr1"])
cf = fin["cashflow"]

# --- 1. Price duration curve -------------------------------------------------
fig, ax = plt.subplots(figsize=(7.2, 4.2))
sorted_price = np.sort(price.values)[::-1]
pct = np.linspace(0, 100, len(sorted_price))
ax.plot(pct, sorted_price, color=BLUE, linewidth=1.4)
ax.axhline(0, color=GRAY, linewidth=0.8)
ax.set_xlabel("% of hours price exceeded")
ax.set_ylabel("Day-ahead price ($/MWh)")
ax.set_title("Modeled ERCOT price pattern for a full year")
fig.tight_layout()
fig.savefig(FIG / "price_duration_curve.png", dpi=200)
plt.close(fig)

# --- 2. Revenue stack (yr1) ---------------------------------------------------
fig, ax = plt.subplots(figsize=(6, 4.2))
labels = ["Energy trading", "Ancillary services"]
vals = [disp["energy_arbitrage_revenue"] / 1e6, disp["ancillary_revenue"] / 1e6]
bars = ax.bar(labels, vals, color=[BLUE, ORANGE], width=0.5)
for b, v in zip(bars, vals):
    ax.text(b.get_x() + b.get_width() / 2, v + 0.15, f"${v:.1f}M", ha="center", fontsize=10)
ax.set_ylabel("Year 1 revenue ($M)")
ax.set_ylim(0, 7)
ax.set_title("Where the battery's revenue comes from in year 1")
fig.tight_layout()
fig.savefig(FIG / "revenue_stack.png", dpi=200)
plt.close(fig)

# --- 3. Cash flow / annual net cash flow ----------------------------
fig, ax = plt.subplots(figsize=(8, 4.5))
colors = [RED if v < 0 else BLUE for v in cf["net_cf"]]
ax.bar(cf["year"], cf["net_cf"] / 1e6, color=colors, width=0.7)
ax.axhline(0, color="black", linewidth=1)
cum = cf["net_cf"].cumsum() / 1e6
ax.plot(cf["year"], cum, color="black", marker="o", markersize=3, linewidth=1.5, label="Running total")
ax.set_xlabel("Project year")
ax.set_ylabel("Cash flow ($M)")
ax.set_title("Cash flow over the project's 20-year life")
ax.legend(loc="lower right", frameon=False, fontsize=9)
fig.tight_layout()
fig.savefig(FIG / "cashflow_waterfall.png", dpi=200)
plt.close(fig)

# --- 4. Tornado chart -----------------------------------------------------------
fig, ax = plt.subplots(figsize=(7.5, 4.5))
tor = tornado.copy()
base = tor["base_npv"].iloc[0] / 1e6
tor["low_m"] = tor["npv_low"] / 1e6
tor["high_m"] = tor["npv_high"] / 1e6
order = tor.reindex(tor[["low_m", "high_m"]].apply(lambda r: max(abs(r["low_m"]-base), abs(r["high_m"]-base)), axis=1).sort_values().index)
y = np.arange(len(order))
ax.barh(y, order["high_m"] - base, left=base, color=BLUE, height=0.55, label="Better case")
ax.barh(y, order["low_m"] - base, left=base, color=RED, height=0.55, label="Worse case")
ax.axvline(base, color="black", linewidth=1.2)
ax.set_yticks(y)
ax.set_yticklabels(order["driver"])
ax.set_xlabel("Project NPV ($M)")
ax.set_title("How much each assumption changes the outcome")
ax.legend(loc="lower right", frameon=False, fontsize=9)
fig.tight_layout()
fig.savefig(FIG / "tornado_sensitivity.png", dpi=200)
plt.close(fig)

# --- 5. Monte Carlo distribution ------------------------------------------------
fig, ax = plt.subplots(figsize=(7.2, 4.2))
npvs = mc["npvs"] / 1e6
ax.hist(npvs, bins=45, color=BLUE, alpha=0.85, edgecolor="white")
ax.axvline(0, color=RED, linewidth=1.6, linestyle="--", label="Break-even (NPV = 0)")
ax.axvline(mc["p50"] / 1e6, color="black", linewidth=1.6, label="Median result")
ax.set_xlabel("Project NPV ($M)")
ax.set_ylabel("Number of simulations")
ax.set_title(f"3,000 simulations: only {mc['p_positive']*100:.0f}% come out profitable")
ax.legend(loc="upper right", frameon=False, fontsize=9)
fig.tight_layout()
fig.savefig(FIG / "monte_carlo_npv.png", dpi=200)
plt.close(fig)

print("Charts written to", FIG)
print("NPV:", fin["npv"], "IRR:", fin["irr"], "LCOS:", fin["lcos_per_mwh"])
print("MC p_positive:", mc["p_positive"], "p50:", mc["p50"])
