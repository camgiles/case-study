const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType, ImageRun, PageBreak,
  Header, Footer, PageNumber, LevelFormat, convertInchesToTwip, TabStopType, TabStopPosition
} = require("docx");
const fs = require("fs");
const path = require("path");

const BLACK = "000000";
const GRAY = "444444";

const FIG = path.join(__dirname, "..", "figures");
const img = (name) => fs.readFileSync(path.join(FIG, name));

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 140 },
    children: [new TextRun({ text, bold: true, color: BLACK, size: 26, font: "Times New Roman" })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 220, after: 100 },
    children: [new TextRun({ text, bold: true, italics: true, color: BLACK, size: 23, font: "Times New Roman" })],
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 200, line: 300 },
    children: [new TextRun({ text, size: 23, color: BLACK, font: "Times New Roman", ...opts })],
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 100, line: 300 },
    children: [new TextRun({ text, size: 23, color: BLACK, font: "Times New Roman" })],
  });
}
function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 280 },
    children: [new TextRun({ text, italics: true, size: 20, color: GRAY, font: "Times New Roman" })],
  });
}
function figure(name, widthIn, caption_) {
  const dims = { width: widthIn * 96, height: (widthIn * 96) * (0.583) };
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [new ImageRun({ data: img(name), transformation: dims, type: "png" })],
    }),
    caption(caption_),
  ];
}

function statTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [4500, 4500],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BLACK },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BLACK },
      left: { style: BorderStyle.SINGLE, size: 4, color: BLACK },
      right: { style: BorderStyle.SINGLE, size: 4, color: BLACK },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
    },
    rows: rows.map(([k, v], i) => new TableRow({
      children: [
        new TableCell({
          width: { size: 4500, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, size: 21, color: BLACK, font: "Times New Roman" })] })],
        }),
        new TableCell({
          width: { size: 4500, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: v, size: 21, color: BLACK, bold: i === 0, font: "Times New Roman" })] })],
        }),
      ],
    })),
  });
}

function assumptionsTable(rows) {
  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: BLACK },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: BLACK },
    left: { style: BorderStyle.SINGLE, size: 4, color: BLACK },
    right: { style: BorderStyle.SINGLE, size: 4, color: BLACK },
  };
  const header = new TableRow({
    tableHeader: true,
    children: ["Parameter", "Value", "Source / Rationale"].map((t) => new TableCell({
      borders: cellBorders,
      width: { size: 3000, type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, color: BLACK, size: 20, font: "Times New Roman" })] })],
    })),
  });
  const body_ = rows.map((r) => new TableRow({
    children: r.map((t) => new TableCell({
      borders: cellBorders,
      width: { size: 3000, type: WidthType.DXA },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: t, size: 19, color: BLACK, font: "Times New Roman" })] })],
    })),
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2500, 2000, 5000],
    rows: [header, ...body_],
  });
}

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.2) } } } }],
    }],
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1100, bottom: 1100, left: 1440, right: 1440 } },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Page ", size: 18, color: GRAY, font: "Times New Roman" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GRAY, font: "Times New Roman" })],
        })],
      }),
    },
    children: [
      // ---- Title block ----
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [new TextRun({ text: "Should Meridian Power Partners Invest in a", bold: true, size: 34, font: "Times New Roman" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 220 },
        children: [new TextRun({ text: "100 MW / 400 MWh Battery Storage Project in ERCOT?", bold: true, size: 34, font: "Times New Roman" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
        children: [new TextRun({ text: "A financial and market analysis of battery storage economics in the ERCOT power market", italics: true, size: 23, color: GRAY, font: "Times New Roman" })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 700 },
        children: [new TextRun({ text: "Cameron Giles", size: 21, color: GRAY, font: "Times New Roman" })],
      }),


      h1("Executive Summary"),
      body("Meridian Power Partners is a fictional company I created for this case study. The question I set out to answer: if Meridian built a 100 MW / 400 MWh (4-hour) battery storage system in ERCOT (the power grid that covers most of Texas) and sold its output on the open market with no long-term contract, would the project make money over its 20-year life? And if not, what would have to change for it to make sense?"),
      body("A quick note on terms before I get into it. A battery this size is usually called a BESS, short for battery energy storage system. NPV means net present value, basically the total value the project creates today after accounting for the fact that money in the future is worth less than money now. IRR is the internal rate of return, the annual return the project effectively earns. Together they're the two main numbers investors look at to decide if a project is worth building."),
      body("The short answer is that this project does not look profitable right now if it has to rely purely on selling power at market prices. Using realistic 2025 assumptions, the model shows the project loses about $41M in present value terms over 20 years, and the IRR comes out close to 0%, well below the roughly 8.5% return an investor would want for taking on this kind of risk. This actually lines up with what's really happening in ERCOT. So much battery storage got built in Texas over the last couple years that prices have become less volatile, which is bad news for batteries, since they make money off price swings."),
      body("That said, the project is not hopeless, it's just early. The sensitivity analysis shows two things matter the most: how much the battery costs to build, and how much revenue it can actually earn. If battery costs keep falling the way industry forecasts expect (roughly to 2030), and if Meridian can lock in even part of its revenue through a contract instead of relying only on the open market, the numbers get a lot closer to breaking even."),
      body("My recommendation: Meridian should not build this project today as a pure merchant bet with no contract. Instead, a smarter path is to wait a few years for costs to come down, lock in a contract for somewhere around 40 to 60 percent of the project's capacity to reduce risk, and look for a site where the battery could be paired with a solar project to save on shared costs."),

      h1("1. Market Context"),
      body("ERCOT is the grid operator for most of Texas, and it has become the fastest growing battery storage market in the country, with over 14 GW of batteries installed by mid-2025. That's a huge number, and it's actually part of the problem for new projects. When prices spike in a power market, that's when batteries make their money (charge up when power is cheap, sell it back when power is expensive). But with so many batteries now competing to catch those price spikes, the spikes have gotten smaller and less frequent. Prices over $200 per megawatt-hour happened far less often in 2025 than in prior years, and big price spikes occurred roughly 40% less often in 2025 than in 2024."),
      body("One thing that surprised me while researching this is that batteries in ERCOT don't actually make most of their money from buying low and selling high on energy anymore. In the first half of 2025, about 42% of battery revenue across the whole ERCOT fleet came from something called ancillary services, basically getting paid to stand ready to help keep the grid stable, rather than from energy trading itself. Only around 40% came from real-time energy and 18% from day-ahead energy. I built this into the model instead of assuming all the revenue comes from energy trading, which is a mistake I noticed a lot of simplified models make."),
      body("On the policy side, there was a law passed in 2025 called the One Big Beautiful Bill Act that cut a lot of the tax credits for home solar and home batteries. The good news for a project like this one is that it left the tax credit for large, standalone battery projects mostly intact. Under Section 48E of the tax code, a project like this can still get a 30% tax credit, as long as it meets some labor and sourcing requirements. I assumed the full 30% credit applies here."),
      body("On the cost side, the National Renewable Energy Laboratory (NREL) publishes yearly cost estimates for battery projects. Their 2025 update expects costs to keep dropping, just more slowly than before, from around $300 to $350 per kilowatt-hour installed today down toward roughly $240 to $250 per kilowatt-hour by 2035."),

      h1("2. How I Built the Model"),
      h2("2.1 How the Battery Makes Money"),
      body("Since I couldn't pull raw, minute-by-minute ERCOT price data for this project, I built a synthetic hourly price series for a full year that mimics the real patterns ERCOT reports publicly: prices are higher in the afternoon and evening, higher in summer and winter, occasionally spike way up, and occasionally go negative. Then I modeled the battery charging during the cheapest hours of each day and discharging during the most expensive hours, limited by its 100 MW power rating, 400 MWh capacity, and 86% round-trip efficiency (batteries lose some energy every time they charge and discharge, this is normal). Finally, I scaled the energy revenue up so the total revenue mix matches the real 58% energy and 42% ancillary services split reported for ERCOT batteries, instead of assuming the battery only ever earns money from energy trading."),
      h2("2.2 The Financial Model"),
      body("I built a 20-year, after-tax cash flow model. It includes the upfront cost to build the project (about $136M at $340 per kilowatt-hour), the 30% tax credit, standard tax depreciation rules for this type of equipment, ongoing maintenance costs that rise 2% a year, a 1.5% per year loss in battery capacity as it ages (all batteries degrade over time), and a big mid-life replacement cost in year 10 equal to 35% of the original build cost (batteries need their internals refreshed partway through their life). All the future cash flows are discounted back to today's dollars at 8.5%, which represents a reasonable required return for a project with this level of risk."),
      h2("2.3 Testing How Sensitive the Results Are"),
      body("I ran two types of risk analysis. The first is a tornado analysis, where I move six key assumptions up and down by 20% one at a time to see which ones swing the results the most. The second is a Monte Carlo simulation, where I ran the model 3,000 times, each time randomly varying the build cost, discount rate, battery degradation, and revenue within realistic ranges, to see the full range of possible outcomes instead of just one single guess."),

      h1("3. Base Case Results"),
      ...figure("revenue_stack.png", 6.0, "Figure 1. Year-1 revenue by source, matching the real 58% energy and 42% ancillary services split reported for ERCOT batteries."),
      ...figure("price_duration_curve.png", 6.0, "Figure 2. The modeled ERCOT price pattern used to drive the battery's charge and discharge decisions."),
      statTable([
        ["Metric", "Base Case"],
        ["Total Build Cost", "$136.0M ($340/kWh, 400 MWh)"],
        ["Tax Credit (30%)", "$40.8M"],
        ["Year 1 Revenue", "$11.4M ($6.6M from energy + $4.8M from ancillary services)"],
        ["20-Year NPV at 8.5%", "-$41.4M"],
        ["Project IRR", "About 0.0%"],
        ["Payback Period", "Never pays back within 20 years"],
        ["Cost of Storage (LCOS)", "$46.1 per MWh delivered"],
      ]),
      new Paragraph({ spacing: { before: 200, after: 160 }, children: [] }),
      ...figure("cashflow_waterfall.png", 6.3, "Figure 3. Yearly and running total cash flow over the project's 20-year life, base case."),
      body("That last metric, LCOS, stands for levelized cost of storage. It's basically the true all-in cost of delivering one megawatt-hour from the battery, once you spread the build cost, financing, and maintenance across everything the battery will ever discharge. At $46 per MWh, it's higher than the roughly $28 per MWh average price the battery is trading against. In plain terms, it costs more to run this battery than the market is currently willing to pay for what it produces. That gap is really the whole story of this case study."),

      h1("4. Sensitivity and Risk Analysis"),
      ...figure("tornado_sensitivity.png", 6.3, "Figure 4. How much NPV changes when each assumption moves up or down by 20%. Build cost and revenue matter the most by far."),
      body("Build cost and achieved revenue are clearly the two biggest levers, each capable of moving NPV by roughly $20 to $25M in either direction. Everything else I tested (the discount rate, maintenance costs, the mid-life replacement cost, and battery degradation) matters a lot less by comparison. If I were advising Meridian, this tells me exactly where to focus: negotiating the equipment purchase price and locking down a good revenue contract matter far more than negotiating a maintenance contract."),
      ...figure("monte_carlo_npv.png", 6.3, "Figure 5. Results from running the model 3,000 times with randomized assumptions."),
      body("Across all 3,000 simulated runs, the project only comes out profitable in a small handful of cases, only a few percent of the time. That tells me this isn't really a technology problem or even a bad market problem. It's more of a financing and contracting problem: the project needs a different deal structure, not just better luck."),

      h1("5. Options and My Recommendation"),
      body("I tested three ways to improve the project, both separately and combined with the base case:"),
      bullet("Wait for costs to fall: pushing the project's start date out to around 2030, when NREL expects battery costs to drop to around $260 per kilowatt-hour, improves NPV from -$41.4M to about -$14.7M and pushes IRR up to about 4.7%. Still short of what an investor would want, but a big improvement on its own."),
      bullet("Lock in some revenue with a contract: if Meridian signs a deal (something like a tolling agreement, where another company pays a set fee to use the battery) that raises effective revenue by about 15% in exchange for giving up some upside, combining this with the 2030 cost assumption brings the project to about -$2.4M NPV and about 7.9% IRR. That's basically break-even against the 8.5% target return."),
      bullet("Pair it with a solar project: building the battery next to an existing or planned solar farm to share grid connection and site costs (modeled here as a 10% reduction in build cost) improves NPV to about -$29.8M on its own. Helpful, but not enough by itself. It works best stacked with the other two options."),
      body("Putting it together: I would not recommend Meridian build this project today as an uncontracted, merchant-only bet. The numbers just do not clear the bar, and the Monte Carlo results confirm that's true across almost every reasonable scenario, not just the base case. Instead, I'd recommend a phased approach. Start securing the site and grid interconnection now, since those approvals can take years. Target actually building the project around 2028 to 2029 to catch the falling cost curve. Negotiate a contract covering 40 to 60 percent of the project's output to reduce risk for lenders and investors, while still keeping some upside if market prices are stronger than expected. And keep an eye out for a nearby solar project to pair with. Put all of that together, and the project moves from clearly unprofitable to roughly break-even, which is a realistic, financeable outcome, especially with any additional upside from stronger-than-expected ancillary service prices or further cost declines."),

      h1("Appendix A. Key Assumptions"),
      assumptionsTable([
        ["Power / Duration", "100 MW / 4-hr (400 MWh)", "Typical size for a utility-scale ERCOT battery project"],
        ["Round-trip efficiency", "86%", "Standard benchmark for utility-scale lithium-ion batteries (NREL)"],
        ["Installed cost", "$340/kWh", "NREL's 2025 Cost Projections for Utility-Scale Battery Storage, mid-case, current-year estimate"],
        ["Fixed maintenance cost", "$9.5/kW per year", "NREL's reported range for utility-scale battery maintenance"],
        ["Degradation", "1.5% per year", "Typical capacity loss rate for lithium-ion utility batteries"],
        ["Mid-life replacement", "35% of build cost in Year 10", "Common industry practice for battery internals partway through project life"],
        ["Tax credit", "30% (Section 48E)", "Standalone storage tax credit that survived the 2025 One Big Beautiful Bill Act, assuming labor and sourcing rules are met"],
        ["Discount rate", "8.5%, after-tax", "A reasonable required return for this type of merchant storage project"],
        ["Revenue mix", "58% energy / 42% ancillary services", "Actual ERCOT battery fleet average for the first half of 2025 (Tyba Energy)"],
        ["Average day-ahead price", "$28/MWh", "Consistent with reported ERCOT averages from 2020 to 2024 and continued price compression in 2025"],
      ]),
      new Paragraph({ spacing: { before: 260 }, children: [new TextRun({ text: "Note: I built this model using publicly available market and cost data to make the numbers realistic, but it is not based on a real project or real proprietary data. This is a student portfolio project meant to demonstrate financial modeling and market analysis skills, not investment advice or due diligence on an actual site.", italics: true, size: 18, color: GRAY })] }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(path.join(__dirname, "Battery_Storage_Investment_Case_Study.docx"), buffer);
  console.log("Report written.");
});
