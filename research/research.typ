#set document(title: "SolaShare Research Report", author: "SolaShare")
#set page(paper: "a4", margin: 2.5cm, numbering: "1")
#set text(size: 11pt, lang: "en")
#set heading(numbering: "1.1")
#set par(justify: true, leading: 0.65em)

#align(center)[
  #text(17pt, weight: "bold")[SolaShare Research Report]

  #v(1em)
  #text(12pt)[Full Markdown Version (External-source edition)]
  #v(2em)
]

#outline(indent: auto)
#pagebreak()

= SolaShare Research Report

== 1. Executive Summary

SolaShare is best understood as a _tokenized infrastructure-finance product_ focused on small and mid-sized solar assets. The core idea is not to "put energy on-chain" in an abstract sense, but to create a transparent, investable, fractional claim on the revenue stream of a real solar installation.

The opportunity exists because three major trends are converging:

- _Solar keeps scaling globally_ and remains one of the cheapest forms of new electricity generation in many markets.#super("[iea-ren-2024]")#super("[irena-costs-2024]")
- _Power systems increasingly need distributed capital, storage, and flexibility_, especially as negative-price events become more common in high-solar systems.#super("[iea-elec-2025]")#super("[iea-elec-2026]")
- _Tokenization is maturing as a financial infrastructure layer_, with credible institutions arguing that it can improve accessibility, transparency, programmability, and operational efficiency.#super("[wef-tokenization-2025]")#super("[mck-tokenization-2024]")

For SolaShare, this means the concept is directionally strong. But the strongest version of the project is _not_ "crypto for solar." The strongest version is:

#quote(block: true)[_A trust-first, compliance-aware financing and investor-access layer for real solar cash flows, using blockchain where it solves real product problems: ownership records, payout logic, transparency, and secondary transferability._]

That framing matters. Judges and investors are more likely to believe SolaShare if it is presented as:
- a _capital formation and transparency product_,
- for a _specific, measurable asset class_,
- with a _clear verification and payout model_,
- rather than a generic "tokenization platform for everything."

---

== 2. Research Questions

This report answers six practical questions:

1. Is solar still an attractive market to build around?
2. Is there a credible gap between project finance needs and retail/internet-native access?
3. Does tokenization meaningfully improve the product, or is it cosmetic?
4. Why start with solar rather than another RWA vertical?
5. What does the competitive landscape look like?
6. What should SolaShare build first to look credible at hackathon stage and beyond?

---

== 3. Problem Definition

=== 3.1 The core market problem

Renewable energy is growing fast, but access to economic upside remains structurally uneven.

For large developers and utilities, capital can come from:
- banks,
- project finance,
- development institutions,
- infrastructure funds,
- corporate PPAs,
- and, in some markets, subsidies or auctions.

Retail investors, by contrast, rarely get access to the underlying project economics in a clean, transparent format. They are usually limited to:
- public equities,
- funds,
- green bonds,
- or loosely structured crowdfunding products.

This creates a mismatch:
- _real solar assets produce measurable output and potentially measurable cash flow_, but
- _ordinary investors rarely get direct, transparent, fractional exposure to those cash flows_.

=== 3.2 Why this matters now

The renewable build-out is not slowing because the world no longer wants solar. It is slowing in many places because deployment increasingly depends on:
- better financing structures,
- faster permitting,
- stronger grid integration,
- and more system flexibility.#super("[iea-ren-2024]")#super("[iea-elec-2026]")

In other words: the energy transition is no longer just a hardware story. It is now also an _infrastructure finance, market design, and system integration story_.

=== 3.3 What SolaShare is trying to solve

SolaShare addresses four concrete frictions:

1. _Access friction_
   Solar infrastructure usually has a high minimum ticket size.

2. _Trust friction_
   Investors struggle to verify:
   - whether the asset exists,
   - whether it is operating,
   - whether it is licensed,
   - and whether its revenue reporting is credible.

3. _Liquidity friction_
   Real infrastructure investments are usually illiquid and hard to exit early.

4. _Operational friction_
   Traditional investment rails make small-ticket, frequent, transparent revenue-sharing hard to operate efficiently.

=== 3.4 Why tokenization is relevant here

The strongest public case for tokenization is not speculation; it is _better asset servicing and market access_.

The World Economic Forum's 2025 report argues that tokenization can enhance transparency, efficiency, programmability, and fractional ownership, while also acknowledging liquidity, interoperability, and regulatory fragmentation as real adoption constraints.#super("[wef-tokenization-2025]")

McKinsey similarly frames tokenization as the creation of digital representations of real assets that can improve operational efficiency, settlement speed, transparency, and access — especially where traditional servicing is manual and expensive.#super("[mck-tokenization-2024]")

That maps well to SolaShare because solar revenue rights are:
- divisible,
- periodic,
- data-driven,
- and easier to explain than many other asset classes.

---

== 4. Why Solar Is the Right First Vertical

=== 4.1 Solar is globally scaling

The IEA expects global renewable capacity to grow by _2.7x by 2030_, with solar PV and wind accounting for _95% of renewable capacity growth through 2030_.#super("[iea-ren-2024]")
The same report says _new solar capacity added between now and 2030 will account for 80% of global renewable power growth_.#super("[iea-ren-2024]")

That makes solar the simplest renewable asset class to justify as a first market:
- it is large,
- still growing,
- measurable,
- easy to visualize,
- and familiar even to non-experts.

=== 4.2 Solar remains economically competitive

IRENA's 2025 cost report on projects commissioned in 2024 says renewables remained the most cost-competitive source of new electricity generation, and that _91% of newly commissioned utility-scale renewable capacity delivered power at a lower cost than the cheapest new fossil-fuel alternative_.#super("[irena-costs-2024]")

For utility-scale solar PV specifically, IRENA reports:
- weighted average total installed costs of _USD 691/kW_ in 2024,
- down _11% year-on-year_,
- and _87% lower than in 2010_.#super("[irena-costs-2024]")

This matters for SolaShare because lower capex and lower LCOE improve the plausibility of smaller, more financeable solar projects.

=== 4.3 Solar is easier to prove than many RWAs

Compared with other infrastructure assets, solar has unusually clear proof layers:
- location,
- equipment serials,
- design capacity,
- metering data,
- generation reports,
- maintenance logs,
- utility invoices / offtake documents,
- photos and satellite evidence.

That makes it well suited for a _proof-of-asset + proof-of-income_ model.

=== 4.4 Solar is more judge-friendly than a generic RWA thesis

For a hackathon judge, "tokenized solar income rights" is easier to understand than:
- tokenized trade finance,
- tokenized real estate debt,
- tokenized private credit,
- or tokenized carbon claims.

The concept can be shown in one sentence:
#quote(block: true)[A verified solar installation issues fractional digital shares in its future revenue stream; investors buy shares, the operator posts verified revenue periods, and holders claim proportional yield.]

That clarity is strategically valuable.

---

== 5. Macro Market Analysis

== 5.1 Global renewables

The IEA's _Renewables 2024_ report paints a strong structural picture:

- Global renewable capacity is expected to grow by _2.7 times by 2030_.#super("[iea-ren-2024]")
- Roughly _5,500 GW_ of new renewable capacity is expected to become operational by 2030 in the IEA main case.#super("[iea-ren-2024]")
- Annual renewable additions could reach _almost 940 GW annually by 2030_.#super("[iea-ren-2024]")
- Solar PV and wind together account for _95%_ of capacity growth through 2030.#super("[iea-ren-2024]")

_Implication for SolaShare:_ the underlying asset class is not niche. It sits inside one of the fastest-growing global infrastructure build-outs.

== 5.2 The economics of solar are good — but not enough on their own

The strongest mistake SolaShare could make is assuming "solar is cheap, therefore financing is easy."

That is not what current market evidence shows.

The IEA repeatedly points to:
- grid bottlenecks,
- permitting delays,
- financing constraints,
- connection queues,
- and flexibility shortages as deployment constraints.#super("[iea-ren-2024]")#super("[iea-elec-2026]")

So the opportunity is not just "finance solar because solar is good."
The opportunity is:
#quote(block: true)[_Create better capital access and better investor confidence around solar assets that are real, verifiable, and operationally legible._]

== 5.3 Grid flexibility is becoming a hard constraint

A very important signal for SolaShare is the growing prevalence of _negative electricity prices_ in some markets.

The IEA's 2025 and 2026 electricity analyses show:
- negative prices are becoming more common in many power markets,
- especially during periods of low demand and abundant solar/wind generation,
- and this trend is a direct signal of insufficient flexibility and storage.#super("[iea-elec-2025]")#super("[iea-elec-2026]")

The IEA explicitly says battery storage is becoming one of the most versatile flexibility tools and notes that:
- utility-scale battery storage additions reached _63 GW in 2024_,
- total installed battery storage capacity reached _124 GW_,
- and battery project costs fell by around _40% in 2024 to around USD 150/kWh_.#super("[iea-elec-2026]")

_Implication for SolaShare:_
A solar-only story is credible as an MVP, but a _solar-plus-storage roadmap_ makes the long-term thesis much stronger.

== 5.4 Distributed and off-grid opportunity

The World Bank / ESMAP and IRENA both show that distributed and off-grid solar is not a marginal curiosity:
- the World Bank says off-grid solar could provide first-time electricity access to _almost 400 million people globally by 2030_ and would be the most cost-effective way to reach _41%_ of people still without access.#super("[wb-offgrid-2024]")
- IRENA reports off-grid solar capacity grew almost _fivefold_ since 2014 and reached _4.1 GW_ by the end of 2023 within its tracked regions.#super("[irena-offgrid-2024]")

Even if SolaShare does not target unelectrified communities first, these sources validate the broader thesis that _small-scale, distributed solar financing matters_.

---

== 6. Kazakhstan Market Context

== 6.1 Why Kazakhstan is strategically interesting

Kazakhstan matters for SolaShare for four reasons:

1. It has a large land area and meaningful solar resource in several regions.
2. It still relies heavily on fossil generation, especially coal.
3. Renewable build-out has already been supported through project-finance and auction-based mechanisms.
4. There appears to be room for more private capital formation in distributed and regional projects.

The IEA's Kazakhstan profile notes that coal represented around _half of Kazakhstan's energy mix_ in 2018 and fuelled around _70% of electricity generation_.#super("[iea-kz-profile]")
That alone creates a strategic decarbonization case for more renewables.

== 6.2 Solar resource quality

Kazakhstan is not uniformly strong for solar. Solar performance is meaningfully better in the south and south-west than in the north.

A scientific assessment of green hydrogen potential in Kazakhstan, drawing on Global Solar Atlas data, reports that:
- solar capacity factors in Kazakhstan vary roughly between _13% and 18%_,
- the _highest values are in the southern part of the country_,
- with especially strong performance in areas south of Balkhash, Kyzylorda, and Mangystau.#super("[kazakhstan-resource-study]")

This supports a practical product conclusion:
#quote(block: true)[SolaShare should not frame Kazakhstan as a single homogeneous solar market. It should explicitly position the first pipeline around the best-performing regions.]

== 6.3 Private project-finance precedent already exists

Kazakhstan is not starting from zero. The EBRD has financed multiple renewable projects in the country, including solar and wind.

Relevant public examples:
- Burnoye Solar was backed as the country's first large-scale commercial solar plant and first privately owned renewable generator under the new framework.#super("[ebrd-burnoye]")
- In 2019, EBRD and the Green Climate Fund supported a _10 MW solar plant in southern Kazakhstan_ under the country's auction scheme.#super("[ebrd-zhanakorgan]")
- In 2020, EBRD, GCF and CIFs supported a _76 MWp solar plant in Karaganda_, noting Kazakhstan's growing solar capacity and auction-based development model.#super("[ebrd-karaganda]")
- In 2023, EBRD backed a _100 MW wind project_ in Zhambyl, which also reinforces the case for later solar-plus-wind or hybrid expansion.#super("[ebrd-shokpar]")

_Implication:_
The public financing record helps prove that Kazakhstan already has:
- bankable renewable project formats,
- precedent for private capital involvement,
- and an institutional basis for more sophisticated capital-market layers.

== 6.4 Where SolaShare fits in Kazakhstan

SolaShare should _not_ pitch itself as a replacement for utility-scale project finance.
That would be strategically weak.

Instead, the stronger fit is:

- _small and medium commercial solar_
- _distributed generation_
- _regional portfolios_
- _special-purpose solar + storage_
- _projects too small or too operationally fragmented for classic infrastructure funds_
- _projects that benefit from a broader base of aligned smaller investors_

That is where tokenized fractional participation becomes genuinely useful.

---

== 7. Customer and User Segments

SolaShare has at least four distinct user groups.

=== 7.1 Asset issuers / developers

These are:
- solar project developers,
- commercial rooftop operators,
- local energy companies,
- SPVs,
- or asset owners seeking capital.

Their problem:
- capital is expensive,
- investor onboarding is cumbersome,
- retail access is fragmented,
- and trust-building is costly.

What they want:
- faster fundraising,
- better investor reporting,
- potential access to a wider investor base,
- and a secondary liquidity story.

=== 7.2 Retail investors

These are users who want:
- real yield,
- understandable assets,
- lower minimum tickets,
- and a tangible climate/infrastructure narrative.

Their problem:
- most green investment products are either too abstract, too expensive, too illiquid, or too opaque.

What they need from SolaShare:
- low minimum entry,
- simple UX,
- visible proof layers,
- and understandable payout logic.

=== 7.3 Sophisticated investors

These could include:
- angel investors,
- family offices,
- crypto-native treasury allocators,
- or small funds.

They care less about the emotional climate narrative and more about:
- diligence,
- legal structure,
- downside protection,
- payout mechanics,
- reporting,
- governance rights,
- and exit.

=== 7.4 Verifiers / operators

These actors create credibility:
- technical verifiers,
- auditors,
- legal operators,
- metering data providers,
- custodial or SPV administrators.

Without them, the model looks like marketing.
With them, it starts to look like real infrastructure finance.

---

== 8. The Proposed SolaShare Product Model

== 8.1 What should be tokenized

The cleanest model is to tokenize _economic rights to revenue_, not:
- physical panel ownership,
- raw electricity units,
- or land title.

That distinction matters for:
- legal clarity,
- economic clarity,
- and product simplicity.

A token should represent a _pro-rata claim on a defined distributable cash-flow pool_, subject to disclosed rules.

== 8.2 What the token should not claim

To reduce confusion, the token should _not_ imply:
- direct ownership of land,
- direct ownership of equipment,
- regulatory authority over grid injection,
- or unrestricted governance rights unless explicitly structured.

A judge will trust the product more if the legal-economic claim is narrow, explicit, and verifiable.

== 8.3 Proposed operating roles

A practical operating model has five layers:

1. _Issuer / SPV_
   Owns or controls the project economics.

2. _Verifier_
   Confirms asset existence and baseline documentation.

3. _Operator / Revenue publisher_
   Uploads revenue periods and supporting evidence.

4. _Investors / token holders_
   Hold pro-rata rights to distributions.

5. _Platform / sponsor service_
   Handles onboarding, reporting, relaying, dashboards, and payout UX.

== 8.4 Proposed lifecycle

1. Project screened and onboarded.
2. Documentation uploaded.
3. Asset verified.
4. Tokens minted.
5. Primary sale opens.
6. Raised capital flows to the issuer / SPV.
7. Asset generates revenue.
8. Revenue period published with proof.
9. Holders claim yield.
10. Optional secondary transfers occur.

That is the end-to-end flow judges want to see.

---

== 9. Why Solana Is a Reasonable Technical Base

This section is not arguing that Solana is the only viable chain.
It is arguing that Solana is a reasonable fit for this specific product.

Official Solana docs state that:
- tokens on Solana are represented through mint accounts and token accounts,
- the ecosystem supports both the original Token Program and _Token-2022_ with extensions,
- and the base transaction fee is _5,000 lamports per signature_.#super("[solana-tokens]")#super("[solana-fees]")#super("[solana-token-extensions]")

Anchor documentation describes Anchor as a framework for building secure Solana programs and highlights its role in simplifying program development and reducing vulnerabilities.#super("[anchor-intro]")

=== Why this matters for SolaShare

SolaShare needs:
- cheap asset issuance,
- cheap claim transactions,
- straightforward token primitives,
- deterministic account structures,
- and a smooth mobile-first UX.

Solana supports those needs with:
- native token primitives,
- relatively low transaction cost structure,
- mature wallet ecosystem,
- and a large pool of hackathon-friendly tooling.

=== The real product advantage is not "fast chain"

The real product advantage is:
- _low-friction claims_
- _cheap state updates_
- _good wallet compatibility_
- _Token-2022 / metadata flexibility if needed_
- _and sponsor-service patterns that make gasless first actions feasible_

For a judge, that is a better explanation than generic TPS claims.

---

== 10. Competitive Landscape

SolaShare does not exist in a vacuum. The market is already crowded — just not with exact equivalents.

The most useful way to think about competition is by _functional category_.

== 10.1 Category A — renewable crowdfunding platforms

=== Enerfip
Enerfip positions itself as a crowdfunding platform dedicated to the energy transition. Its website states:
- _€826 million_ financed by investors,
- _60,000+ investors_,
- and investment entry starting from _€10_.#super("[enerfip-home]")

This is strong proof that:
- retail climate/infrastructure investing exists,
- users will fund renewable projects online,
- and transparent project listings with small tickets are commercially viable.

=== Trine
Trine positions itself as a platform where private individuals invest in solar energy companies in emerging markets. Its public materials say:
- it has around _15,000 investors_,
- focuses on solar in markets such as Kenya, India, and Vietnam,
- and presents due-diligence summaries and repayment information to investors.#super("[trine-careers]")#super("[trine-how]")

This validates the cross-border, solar-focused retail-investment thesis.

=== What Category A means for SolaShare
These platforms prove demand — but they are not usually built around:
- on-chain ownership,
- programmable claim mechanics,
- or secondary digital transferability.

That is SolaShare's opening.

== 10.2 Category B — solar financing / operator models

=== Sun Exchange
Sun Exchange says it has developed _over 100 solar power and energy storage projects since 2015_.#super("[sunexchange-home]")

Its current positioning is more service/operator-oriented than pure retail tokenized finance. Still, it validates an important point:
- third-party financed solar deployment is real,
- and customers will adopt solar when capex and operating complexity are removed.

=== What Category B means for SolaShare
This category validates the asset class, but it does not fully solve retail-access + liquid digital ownership.

== 10.3 Category C — blockchain energy trading platforms

=== Powerledger
Powerledger describes itself as software for tracking, tracing and trading renewable energy, and says its solutions support energy trading, environmental commodities, and renewable traceability.#super("[powerledger-home]")

=== SunContract
SunContract presents itself as a blockchain-based P2P renewable electricity marketplace and says it has _more than 10,000 registered customers_ in Slovenia.#super("[suncontract-home]")

=== What Category C means for SolaShare
These platforms validate the use of blockchain in energy markets, but they focus more on:
- trading electricity,
- energy marketplaces,
- and traceability,
than on _fractional project revenue investing_.

== 10.4 Competitive conclusion

No single visible competitor category fully combines all four of these elements:

1. _real solar asset focus_
2. _retail-friendly fractional economic rights_
3. _transparent proof-of-asset / proof-of-income_
4. _crypto complexity hidden behind simple onboarding_

That suggests SolaShare's opportunity is real — but also that its moat will come from _execution quality_, not novelty alone.

---

== 11. Strategic Positioning

The strongest positioning is:

#quote(block: true)[_SolaShare is a trust-first financing and investor-access layer for verified solar cash flows._]

Not:
- "an exchange for tokenized energy,"
- "a DeFi solar marketplace,"
- or "a generic RWA tokenization layer."

=== Why this positioning wins

Because it:
- sounds more real,
- maps better to actual user needs,
- is easier to regulate over time,
- and avoids promising things the MVP cannot yet prove.

---

== 12. Business Model Options

SolaShare has multiple monetization paths. The best early-stage model is probably a combination.

=== 12.1 Primary issuance fee
Charge issuers for structuring, onboarding, and fundraising.

=== 12.2 Platform fee on distributions
A small fee on posted revenue or claimed yield.

=== 12.3 Verification / due-diligence fee
Charge for document review, technical verification, and proof-layer setup.

=== 12.4 Secondary transfer fee
If secondary liquidity is enabled, take a marketplace or transfer fee.

=== 12.5 Premium data room / reporting
Offer advanced diligence materials or portfolio reporting to larger investors.

=== Recommended early approach
For MVP-stage credibility, the cleanest message is:
- _issuer onboarding fee + modest platform percentage on successful raise_
- with verification either bundled or transparently itemized.

This is easier for judges to understand than a complex tokenomics story.

---

== 13. Unit-Economics and Asset-Economics Logic

A serious judge will want to know whether the economics are conceptually coherent.

SolaShare does not need perfect project-finance models at hackathon stage, but it does need a clear formula.

== 13.1 Minimal valuation framework

At asset level, value should be based on:
- capex,
- installation cost,
- expected annual generation,
- degradation assumptions,
- opex,
- insurance / maintenance,
- offtake / tariff structure,
- taxes,
- reserve policy,
- and target investor return.

== 13.2 Simplified token pricing logic

If:
- project enterprise value = \$100,000
- tokenized distribution pool = 40% of distributable cash flow
- number of tokens = 20,000

Then each token corresponds to a defined slice of the economic pool.

The exact legal wrapper may vary, but the principle must remain simple:
#quote(block: true)[Token price should be anchored to disclosed project economics, not arbitrary "community token" pricing.]

== 13.3 Why the platform should avoid overpromising APY

A common mistake in crypto products is to lead with a headline yield number.
That is risky here.

Instead, SolaShare should present:
- projected ranges,
- scenario-based payouts,
- downside assumptions,
- and explicit notes on seasonality and operating risk.

That will feel much more credible.

---

== 14. The Trust Problem: What Investors Will Actually Need

This is one of the most important sections in the whole research.

The commercial risk for SolaShare is not that people fail to understand solar.
It is that they fail to trust:
- the project,
- the operator,
- the documents,
- or the payout logic.

=== A serious investor will want at least:

- legal identity of issuer / SPV,
- asset address or geolocation,
- equipment spec,
- installed capacity,
- commissioning status,
- metering methodology,
- license / permit evidence where relevant,
- revenue evidence,
- maintenance and downtime logs,
- reserve policy,
- claim waterfall,
- and independent verification.

=== Therefore, SolaShare should build a trust stack, not just a token stack

A good trust stack includes:
1. _public asset passport_
2. _public proof bundle_
3. _structured diligence summary_
4. _investor-readable economics page_
5. _disclosure of key legal risks_
6. _auditable revenue posting_
7. _clear claim history_

That trust stack is probably more important than the blockchain itself.

---

== 15. Risks and Failure Modes

== 15.1 Regulatory risk
The biggest long-term risk is legal characterization:
- Is the token a security?
- What claims does it represent?
- Which jurisdictions can participate?
- What investor-protection rules apply?

=== Mitigation
Start with a narrow, well-disclosed structure and avoid vague ownership claims.

== 15.2 Asset-verification risk
If one fraudulent or overstated asset enters the platform, trust can collapse.

=== Mitigation
Mandatory verification, external proof storage, and clear verifier accountability.

== 15.3 Revenue-reporting risk
Operators may overstate or selectively present revenue.

=== Mitigation
Standardized reporting templates, meter-linked evidence where possible, and auditable posting history.

== 15.4 Liquidity illusion risk
A token may be technically transferable but economically illiquid.

=== Mitigation
Do not oversell secondary liquidity. Present it as a roadmap or limited feature unless there is real market depth.

== 15.5 UX risk
If onboarding still feels like crypto, mainstream users will drop.

=== Mitigation
Gasless first action, Telegram or mobile-first flow, and plain-language investment pages.

== 15.6 Power-market risk
High solar penetration can reduce realized value of midday generation unless storage or pricing mechanisms improve.#super("[iea-elec-2025]")#super("[iea-elec-2026]")

=== Mitigation
Roadmap toward hybrid solar + storage products and better revenue-model disclosure.

== 15.7 Country risk
Kazakhstan adds:
- regulatory interpretation risk,
- currency risk,
- offtake / payment chain risk,
- and local execution risk.

=== Mitigation
Start with a small number of carefully structured pilot assets rather than a broad marketplace launch.

---

== 16. Why Solar + Storage Should Be on the Roadmap

The IEA's recent electricity work makes this very clear: storage is no longer optional in many high-renewable systems.#super("[iea-elec-2026]")

=== Why this matters strategically
If SolaShare stays purely solar long term, it may end up financing assets whose revenue profile deteriorates as midday oversupply grows.

=== Better long-term framing
SolaShare should start as:
- _solar-first_

and evolve toward:
- _solar-plus-storage_
- then possibly _distributed energy income assets_

That sequence is much stronger than jumping immediately to wind, EV charging, carbon credits, and everything else.

---

== 17.1 What must be in the MVP
- Asset creation
- Public asset passport
- Verified / unverified status
- Fractional token issuance
- Primary purchase flow
- Revenue period posting
- Claim flow
- Investor dashboard
- Proof documents page
- Basic admin / verifier view

== 17.2 What does not need to be in the MVP
- full secondary market,
- advanced governance,
- cross-chain expansion,
- complex tokenomics,
- or broad multi-asset support.

== 17.3 Hackathon demo script
The best demo is:
1. show a solar asset;
2. show its verification package;
3. mint and purchase shares;
4. post a revenue epoch;
5. claim yield;
6. open the investor dashboard and show proof history.

That is enough. A complete, believable loop beats a large but shallow product.

---

== 19. SolaShare vs. Alternatives

| Option | What user gets | Main weakness |
|---|---|---|
| Public renewable-energy stocks | Liquid listed exposure | Indirect, corporate-level exposure rather than asset-level economics |
| Green bonds | Familiar fixed-income product | Usually inaccessible at small-ticket retail/project level |
| Crowdfunding platform | Direct project exposure | Often illiquid, off-chain, harder to service or transfer |
| P2P energy marketplace | Energy trading access | Not the same as investing in project cash flows |
| SolaShare | Fractional, transparent, programmable exposure to solar revenue rights | Requires strong trust, legal framing, and proof systems |

This is the clearest way to explain why SolaShare exists.

---

== 20. Overall Assessment

== 20.1 What is strong about the idea
- Strong macro tailwind
- Intuitive asset class
- Clear measurement layer
- Good fit for fractional access
- Real use for on-chain payout logic
- Strong demo potential

== 20.2 What is weak if not handled carefully
- Legal ambiguity
- Trust deficit
- Asset-quality variance
- Secondary-liquidity overclaim
- "crypto product" perception

== 20.3 Final verdict
If presented correctly, SolaShare is _not just a nice hackathon idea_.
It is a credible prototype direction for a real product category.

But its credibility depends on one core discipline:

#quote(block: true)[_Lead with asset quality, verification, and investor clarity. Use tokenization as infrastructure, not as the headline._]

That is the version a serious judge is most likely to respect.

---

== 22. Public Sources and References

=== Energy transition, solar economics, flexibility
#super("[iea-ren-2024]"): International Energy Agency (IEA), _Renewables 2024_ — Executive Summary. https://www.iea.org/reports/renewables-2024/executive-summary
#super("[iea-ren-electricity]"): International Energy Agency (IEA), _Renewables 2024 — Electricity_. https://www.iea.org/reports/renewables-2024/electricity
#super("[iea-elec-2025]"): International Energy Agency (IEA), _Electricity 2025 — Prices_. https://www.iea.org/reports/electricity-2025/prices
#super("[iea-elec-2026]"): International Energy Agency (IEA), _Electricity 2026 — Flexibility_. https://www.iea.org/reports/electricity-2026/flexibility
#super("[irena-costs-2024]"): International Renewable Energy Agency (IRENA), _Renewable Power Generation Costs in 2024_ (2025). https://www.irena.org/publications/2025/Jun/Renewable-Power-Generation-Costs-in-2024
#super("[irena-capacity-2025]"): International Renewable Energy Agency (IRENA), _Record-Breaking Annual Growth in Renewable Power Capacity_ (2025). https://www.irena.org/News/pressreleases/2025/Mar/Record-Breaking-Annual-Growth-in-Renewable-Power-Capacity
#super("[irena-solar-overview]"): International Renewable Energy Agency (IRENA), _Solar Energy_ overview page. https://www.irena.org/Energy-Transition/Technology/Solar-energy/

=== Off-grid / distributed energy
#super("[wb-offgrid-2024]"): World Bank / ESMAP, _Off-grid Solar Could Provide First-time Electricity Access to Almost 400 Million People Globally by 2030_ (2024). https://www.worldbank.org/en/news/press-release/2024/10/08/off-grid-solar-could-provide-first-time-electricity-access-to-almost-400-million-people-globally-by-2030
#super("[irena-offgrid-2024]"): IRENA, _Off-grid Renewable Energy Highlights 2024_. https://www.irena.org/-/media/Files/IRENA/Agency/Publication/2024/Dec/Off-grid_renewable_energy_highlights_2024.pdf
#super("[wb-mini-grids-2024]"): World Bank Open Knowledge Repository, _Mini Grids for Underserved Main Grid Customers_ (2024). https://openknowledge.worldbank.org/entities/publication/d2931c2e-c12d-448d-9324-2d5563c45523

=== Kazakhstan market context
#super("[iea-kz-profile]"): International Energy Agency (IEA), _Kazakhstan Energy Profile_ (2020). https://www.iea.org/reports/kazakhstan-energy-profile
#super("[wb-global-pv-country]"): World Bank / ESMAP, _Global Photovoltaic Power Potential by Country_ (2020). https://www.worldbank.org/en/topic/energy/publication/solar-photovoltaic-power-potential-by-country
#super("[kazakhstan-resource-study]"): Akhmetbekov et al., _Resource assessment for green hydrogen production in Kazakhstan_, _International Journal of Hydrogen Energy_ (2023). ScienceDirect landing page: https://www.sciencedirect.com/science/article/pii/S0360319923001805
#super("[ebrd-burnoye]"): EBRD, _First large-scale solar plant in Kazakhstan receives EBRD backing_ (2015). https://www.ebrd.com/news/2015/first-largescale-solar-plant-in-kazakhstan-receives-ebrd-backing.html
#super("[ebrd-zhanakorgan]"): EBRD, _EBRD and Green Climate Fund commit up to US\$ 6.4 million to finance new solar plant in Kazakhstan_ (2019). https://www.ebrd.com/home/news-and-events/news/2019/ebrd-and-green-climate-fund-commit-up-to-us-64-million-to-finance-new-solar-plant-in-kazakhstan.html
#super("[ebrd-karaganda]"): EBRD, _EBRD, GCF and CIFs US\$ 42.6 million for solar plant in Kazakhstan_ (2020). https://www.ebrd.com/home/news-and-events/news/2020/ebrd-gcf-and-cifs-us-426-million-for-solar-plant-in-kazakhstan.html
#super("[ebrd-shokpar]"): EBRD, _EBRD helps Kazakhstan add 100 MW of renewable energy capacity_ (2023). https://www.ebrd.com/home/news-and-events/news/2023/ebrd-helps-kazakhstan-add-100-mw-of-renewable-energy-capacity.html

=== Tokenization / digital asset infrastructure
#super("[wef-tokenization-2025]"): World Economic Forum, _Asset Tokenization in Financial Markets: The Next Generation of Value Exchange_ (2025). https://www.weforum.org/publications/asset-tokenization-in-financial-markets-the-next-generation-of-value-exchange/
#super("[mck-tokenization-2024]"): McKinsey, _What is tokenization?_ (updated 2024). https://www.mckinsey.com/featured-insights/mckinsey-explainers/what-is-tokenization

=== Solana / implementation references
#super("[solana-tokens]"): Solana Docs, _Tokens on Solana_. https://solana.com/docs/tokens
#super("[solana-fees]"): Solana Docs, _Fees_. https://solana.com/docs/core/fees
#super("[solana-token-extensions]"): Solana Docs, _Extensions (Token-2022)_. https://solana.com/docs/tokens/extensions
#super("[anchor-intro]"): Anchor Docs, _Introduction_. https://www.anchor-lang.com/docs

=== Competitor and market-validation references
#super("[enerfip-home]"): Enerfip official website. https://www.enerfip.eu/
#super("[trine-careers]"): Trine careers / company overview page. https://careers.trine.com/
#super("[trine-how]"): Trine Help Center, _How does Trine work?_ https://help.trine.com/en/articles/2912367-how-does-trine-work
#super("[sunexchange-home]"): Sun Exchange official website. https://sunexchange.com/
#super("[powerledger-home]"): Powerledger official website. https://powerledger.io/
#super("[suncontract-home]"): SunContract official website. https://suncontract.org/en/
