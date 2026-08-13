# Should Meridian Power Partners invest in a 100MW/400MWh battery storage project in ERCOT?

An investment case study combining **financial modeling** and **power-market analysis** to answer a question every renewables/storage developer is asking in 2026: does standalone battery storage still clear the cost of capital in ERCOT?

Built as a passion project applying a finance + data science background to power, renewables, and energy consulting problems.

## What's here

| Folder | Contents |
|---|---|
| `analysis/` | Python model: calibrated ERCOT price curve, dispatch/revenue simulation, 20-year project-finance model, tornado sensitivity, Monte Carlo risk simulation |
| `report/` | `Battery_Storage_Investment_Case_Study.docx` — a full consulting case study (market context, methodology, results, recommendation, sourced assumptions) |
| `dashboard/` | `index.html` — standalone interactive dashboard; drag sliders on capex, achieved revenue, discount rate, and the ITC to see NPV/IRR/payback update live |
| `figures/` | Chart exports used in the report |
| `data/` | Model outputs (`model_summary.json`, cash flow and sensitivity CSVs) |

## Headline finding

Under base-case assumptions (**$340/kWh** installed cost, a **30% Section 48E ITC**, and revenue calibrated to 2025 ERCOT storage-fleet reporting (58% energy arbitrage / 42% ancillary services)), the project's 20-year NPV is **≈ –$41M** at an 8.5% discount rate, and a Monte Carlo simulation puts the odds of a positive NPV at roughly **3%** on a purely merchant basis.

The project isn't unfinanceable, it's early. Layering NREL's published capex-decline trajectory to ~2030, a partial contracted-revenue structure, and co-location with solar moves the economics from clearly sub-hurdle to roughly at the cost of capital. Full reasoning is in the report.

## Run it yourself

```bash
cd analysis
pip install numpy pandas matplotlib scipy
python3 battery_model.py     # prints the model summary as JSON
python3 make_charts.py       # regenerates the figures used in the report
```

Download `dashboard/index.html` and open it. It will open directly in your browser

## Data & sourcing

This project does not use a live ERCOT/EIA data feed. Hourly prices are a **stylized, calibrated synthetic series**. Its mean, diurnal shape, seasonality, spike frequency, and negative-pricing frequency are matched to publicly reported 2025 ERCOT market statistics (Potomac Economics *2025 State of the Market Report for ERCOT*; Tyba Energy *ERCOT Storage Performance, H1 2025*), not raw nodal data. Cost and incentive assumptions are calibrated to NREL's *Cost Projections for Utility-Scale Battery Storage (2025 Update)* and to IRS Section 48E guidance following the One Big Beautiful Bill Act (2025). Full citations and rationale for every assumption are in Appendix A of the report.
