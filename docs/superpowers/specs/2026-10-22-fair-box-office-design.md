# Fair Box Office Design

22 October 2026. Consolidated implementation design, including the final fame, Greenlight buzz and worldwide-exposure requirements. Evidence: [current-system audit](</Users/zeesh/Vibe code/Actor empire/docs/reports/2026-10-22-box-office-analysis/report.md>) and [initial brainstorm](</Users/zeesh/Vibe code/Actor empire/docs/reports/2026-10-22-box-office-analysis/revamp-brainstorm.md>).

The user approved the shared-market direction and requested repeat attendance, favorite actor/studio behavior, streaming deferral, earned universe events, believable small-film discovery, broader reuse of existing systems, and a foundation for future cinema-chain ownership. This is design work; no gameplay implementation is included.

Confirmed decisions:

- Ticket prices are automatic by country and cinema chain.
- Budget/earning amounts in the conversation were examples, not proposed fixed caps.
- Earnings come from the actual modeled audience, spending and cinema market.
- Full series/rating bugs will be triaged separately when the user supplies those reports. IMDb audience insights are included here; a numerical-rating redesign is a separate decision.

**Implementation status:** Phase 1 foundations are implemented; [verification and remaining integration boundaries](../../reports/2026-10-22-box-office-phase1/README.md). The shared audience market is not yet active.

## Global constraints

- Automatic country/chain ticket prices; no manual ticket-price slider.
- Availability is not awareness; awareness is not a sale.
- No fixed monetary box-office cap or guaranteed budget multiple in the new model.
- One canonical title and one committed market result per absolute week.
- Preserve earned money, historical gross, paid costs and signed contracts.
- Share population, spending, time and cinema capacity across owner routes.
- Preserve save-generation verification/recovery and the frozen English localization baseline.
- Full cinema-chain management, numerical IMDb redesign and series bug fixes are outside this change.

## The complete direction

One world contains the people and households. Those people have finite money and time, varying tastes and access, and memories of films, actors, studios and connected stories. A shared entertainment decision can produce a first cinema visit, a paid repeat visit, streaming deferral, later streaming consumption, or no consumption.

Cinema revenue comes from the visits that actually become paid tickets in available shows. All producer/owner routes use the same demand and settlement rules. Strong preparation earns advantages; it does not overwrite affordability, actual awareness, capacity or audience response.

A very large film can become the world's biggest grosser when awareness, event appeal, connected audience history, execution, release access and the world economy support it. A small film can make a large return through fit and discovery. Neither outcome has a cash-budget multiplier or fixed lifetime reward ceiling.

## Audience behavior: preferences, history and current intent

These are overlapping preferences and changing decisions, not six permanent disjoint populations:

| Behavior | Why it happens | Required simulation behavior |
|---|---|---|
| Opening/event attendance | Favorite star, loved characters, social urgency, meaningful spectacle | Increased likelihood of buying a first ticket, bounded by reach and price |
| Positive repeat attendance | Loved the film; immersive experience; favorite actor/studio/franchise; going again with friends | Extra paid visit from someone already counted as a viewer; uses fresh money, time and a seat |
| Discovery later in the run | Recommendations, critics, social attention, local relevance, new markets | Newly aware people can enter; growth has a traceable new-audience source |
| Wait for streaming | Household cost, travel/time, comfort, expected platform arrival, low theatrical urgency | Defers the decision without becoming a current ticket or guaranteed future stream |
| Participate in both | Cinema experience now, streaming rewatch/catch-up later | Same people can use both media; each activity has its correct cost/access treatment |
| Skip or lose interest | Poor fit, weak reputation, no access, no money/time, waiting too long | No forced expenditure or mandatory delayed consumption |

A viewer can love a film and still prefer seeing it at home. “Good film,” “theater urgency,” “repeat desire” and “financial return” must remain distinct.

## 1. Favorites and earned loyalty

Track compact country/cohort affinity and familiarity for relevant actors, studios, franchises and characters. Separate initial recognition from affection and trust built through actual delivered work.

- Actor affinity makes awareness and interest easier when the actor has a meaningful role. A small cameo does not justify the same effect as a satisfying lead role.
- Studio trust is earned through the kind of films that cohort actually enjoyed; it is not an equal worldwide bonus simply for owning a production house.
- Franchise/character attachment can be stronger than general studio trust, particularly for a connected event.
- Positive experiences strengthen relevant affinities; disappointing delivery, misleading promises, repeated weak films and excessive cadence can weaken them.
- Fans remain part of the existing audience. Followers, community memberships and individual star fan counts are overlapping signals, not additive pools of new people.

Putting ten famous actors in a film does not add ten fully separate audiences. The benefit depends on incremental reach, their relevance to the story, existing audience overlap and delivered satisfaction. Strong casting remains valuable; it has diminishing returns and real cost.

Do not copy current platform `loyaltyIndex` directly into actor or studio affection. It is partly derived from subscriber scale and serves a different purpose. Likewise, narrative fandom sizes are not population-reconciled counts of unique ticket buyers.

## 2. Repeat visits are a first-class part of box office

Persist first-time viewers and repeat admissions separately. A compact per-active-title/cohort history can distinguish never-seen, seen once, and repeat-prone exposure bands without creating individual person records.

Repeat willingness should reflect audience satisfaction, theater-experience appeal, actor/studio/character attachment, event/community interest, the opportunity to return with friends, price and remaining leisure budget. It should decline with recent repeated exposure. Some devoted fans can attend more than twice; there is no need to pretend every viewer stops after a universal second visit.

Every additional admission consumes an affordable ticket, an available show seat and modeled leisure time. A person cannot be refreshed as a new viewer every week. Friends newly brought along count as new viewers only if they were not already in that title's reached/seen group.

Example, purely for explaining the counts: 8 million distinct cinema viewers plus 3 million additional visits equals 11 million tickets. It does not mean 11 million unique fans. At the applicable ticket prices, all 11 million tickets can earn legitimate box office.

Existing streaming repeat-start telemetry is useful conceptual groundwork, but subscription replays and cinema tickets have different economics. The current streaming repeat percentage must not be copied as an automatic ticket uplift.

## 3. Audience can deliberately wait for streaming

Model a home-viewing preference and compare the cost/effort of an outing with the film's urgency and available alternatives. A parent may value a family cinema outing yet wait because several tickets are unaffordable. A film fan may buy a premium ticket because immersion and avoiding spoilers matter more.

Known release-window facts should influence that choice. A short, announced platform window can encourage waiting; a genuine event can still draw strong theater demand. Waiting is uncertain when no platform deal or premiere exists. The model must not invent a confirmed date just to force deferral.

Deferred interest is a compact decaying intention, not a reservation of cash or a guaranteed view. When the film becomes available, the existing country rights, localization, payment/entitlement, current interest and platform capacity rules determine whether the household watches. A subscription stream is not a second cinema-ticket payment, and a pirated view is not paid revenue.

No fixed division such as “40% always wait” applies to every genre or market. Access, income, life stage, tastes, price, familiarity and the specific film change the mix.

## 4. Earned connected-universe events

The Iron Man → multiple character films → crossover example should be supported by audience history, rather than just a `universeId` bonus.

Before the event, measure:

- how much of each relevant audience has actually encountered the earlier films/characters, in cinemas or through legitimate streaming exposure;
- how much they enjoyed that work and trust the connected story;
- overlap between character/actor audiences, rather than summing each fanbase;
- how meaningful the returning roles, character combinations and payoff are;
- how accessible the new event is to a viewer who has not watched everything;
- recency, release cadence, repeated formulas and franchise fatigue;
- how much the campaign communicates the event and where it is actually available.

That preparation can earn high opening urgency, broader conversion, social turnout, premium-show appeal and paid repeats. Strong execution can sustain it; a weak payoff can produce a big opening and disappointing legs.

Earlier films can also find a new streaming audience before the event. Actual catch-up exposure can improve familiarity; merely placing old titles in a catalogue does not mean everybody watched them. Theater/streaming exposure overlaps must be reconciled when estimating familiarity.

No mandatory count of precursor films is proposed for general box-office success. A standalone original can still become an event. The existing AI blueprint helper's branch/familiarity thresholds are useful design evidence, not a rule to impose unchanged on player releases.

An established universe should have a credible advantage over an equally visible unknown title, while remaining capable of financial failure. Correct the accepted-role cast and budget treatment defects instead of forcing universe films to succeed or fail.

## 5. Small-film marketing and believable word of mouth

Paid marketing creates awareness in accessible, relevant audiences. Organic awareness comes from existing followers/affinity, real recommendations, local discovery, reviews and relevant media coverage. Both routes face overlap and saturation.

A tiny unknown film with no campaign can be discovered, but its quality is not automatically known by the whole world. Word of mouth starts from actual exposed/satisfied audiences and recruits net-new people at a bounded rate. Contact/reach, language, local relevance and competing attention determine how far it spreads.

Paid repeats can demonstrate enthusiasm, but recommending to the same friends repeatedly does not create unlimited new viewers. Social impressions are not ticket buyers, and misleading marketing can increase expectations faster than delivered satisfaction.

Distinguish these outcomes:

- Good small film + effective focused campaign: accessible launch, useful early exposure, room for an efficient profitable run.
- Good unknown film + little paid support: modest discovery, possible gradual spread; global breakout remains exceptional.
- Film with a large existing following + no paid campaign: meaningful organic awareness can already exist, so a quiet paid budget does not imply nobody knows about it.
- Large expensive film + insufficient awareness/distribution: can miss badly even with high production value.
- Strong local film: can be successful within its actual audience without needing a worldwide release.

Spreading to additional countries requires real availability and language support. Word of mouth cannot sell tickets in an unavailable market. Preserve small-screen/local availability long enough for credible sleepers instead of removing every low opening immediately.

## 6. IMDb and audience presentation

Add a public audience-experience summary fed by settled modeled behavior. Proposed labels include:

- “Strong theater interest” or “Worth seeing on the big screen.”
- “High repeat interest.”
- “Growing through word of mouth.”
- “Many viewers are happy to wait for streaming.”
- “Especially popular with franchise fans.”
- “Strong home-viewing appeal.”

These can coexist. They should change over the run, use minimum evidence/confidence rules, and respect country/persona differences. Before release, show an expectation or forecast; do not show observed repeat attendance before tickets have been sold. Avoid implying that a home-viewing preference means low quality.

The population/cohort model produces estimated audience evidence, not literal individual votes. Label sample/read confidence appropriately. A public score or tag should summarize the modeled experience and choice that produced demand; do not apply it again as an extra unexplained revenue multiplier.

Current `buildAudienceReception` includes gross-to-budget proof in its score. Feeding that score directly into future demand would risk a circular “high gross means higher satisfaction means more gross” loop. Rebase the experience input on delivery, fit, expectation gap and actual modeled response before making it causal. Keep actor craft, public rating, viewing preference and financial verdict distinct.

This extends the in-game IMDb audience panel and existing media/reaction presentation. It is not a proposal to overhaul the numerical rating formula or the reported series issues in the same change.

## 7. Broader systems reuse: what was actually found

| Current code | Verified behavior | Adaptation for this revamp |
|---|---|---|
| `worldPopulation`, `worldAudienceCohorts`, `worldAudienceParticipation` | Canonical people, household budgets, life stages, access, cinema/streaming participation | Shared market foundation; preserve category budget conservation |
| `worldStreamingViewing` | Genre/persona matching, language fit, fandom weighting, title freshness, competition for attention | Share useful audience-fit definitions; add cinema urgency and attendance history |
| `worldStreamingViewing` engagement and discovery | Completion, repeat-start estimates, satisfaction, homepage/recommendation/search/direct/marketing/external discovery mix | Separate paid repeat visits; adapt discovery channels to critics, peers, media and cinema exposure |
| `worldStreamingContentValue` | Smooth diminishing catalogue breadth, title aging, authored quality distinct from measured response | Reuse diminishing-return and age principles; do not mint a second premiere or count stale content as fresh |
| `worldStreamingAudienceChoice` and household wallets | Primary/secondary access overlap, affordability, no-participation option, shared integer-currency allocation | Common bounded choice and spending conventions; cinema is a new adapter, not a clone of subscription allocation |
| `streamingLaunchMarketing` and lifecycle | Country/channel allocation, organic baseline, saturation, declining spend efficiency, awareness timing | Film-specific awareness growth and organic/paid discovery; remove platform-only infrastructure factors |
| `industryMediaFandoms` | Actor/company/project/universe-compatible identities, loyalty/activity/coordination, campaigns and response history | Use as communication/affinity evidence; reconcile influence with actual population and overlap |
| Industry content novelty/intelligence | Similarity, market saturation, continuity fatigue and learning | One clear fatigue effect; avoid stacking several penalties for the same repetition |
| Universe blueprints and canonical universe state | Founding/history concepts, familiarity/branch/fatigue helper logic, canonical ownership and roster | Connect event demand to delivered history and actual exposure; preserve IDs and player control |
| Streaming rights and content availability | Country/date windows, production readiness, eligible entitlement routes, localization | Deferral/catch-up only when access is actually supported |
| `audienceReception`, reaction templates and IMDb audience UI | Current audience summaries, quotes, public presentation | Show the new consistent audience facts without inventing a separate result |
| Shared industry ledger, deterministic RNG and save safeguards | Canonical project IDs, committed weekly facts, replay protection | One market result feeding money, media, rewards, charts and future cinema businesses |

Important limits: some existing scores and fan counts are broad proxies. `advanceIndustryUniverseBlueprint` is tested, but a production caller of that progression helper was not found in the current search. It is reusable logic to assess, not proof that complete player event buildup already drives tickets. Current platform loyalty, media follower counts and total starts do not establish unique cinema demand.

The original world-economy roadmap explicitly reserved **WE9** for future cinema/box-office participation, including unique viewers, repeats, substitution and cinema chains. This proposal fits that intended adapter boundary. The roadmap's delivered-status claims are historical context; current tests/source are the evidence for behavior reused here.

## 8. Foundation for cinema chains

Separate **a film's demand** from **a cinema's supply and service**:

- Demand carries audience interest, exposure, loyalty, urgency and affordability.
- Supply carries country/location, chain, seats, show schedule, formats, accessible price and service experience.
- Settlement carries tickets, public gross, cinema share, distributor/studio share, costs and signed participation.

Today, existing NPC chains provide supply. Future player-owned cinemas can provide or compete for that same supply without replacing the audience economy. Film-side choices should request/book a feasible show footprint, not receive all of a chain's screens independently of every other movie.

Location/travel access, comfort, formats, scheduling and chain reputation can become meaningful future cinema choices. Define compatible supply inputs now; full cinema acquisition/building/concession management remains its own later feature.

Vertical ownership must reconcile: if the player owns both producer and cinema, each receives its proper share of the same ticket. Owning both must not pay the full ticket gross twice. Internal transfers and consolidated cash/profit need consistent treatment.

## 9. What remains from the approved core

- One shared market for player productions, offered gigs and NPC releases; one canonical identity per film.
- Automatic country/chain prices; real awareness, country access, household affordability, time and shared seats.
- No budget-tier revenue cliff, automatic huge-cast gross, repeated weekly multiplier growth or universal $3B removal event.
- Country/chain run decisions follow occupancy and opportunity cost, with a discovery grace policy for suitable small films.
- Public gross, unique viewers, tickets, repeat visits, studio receipts, actual costs and actor earnings are distinct.
- Signed actor pay, investors, rights and talent participation settle exactly once. Earned old cash and historical facts remain intact.
- Existing accepted-cast, cast-ID, universe-attribution and cap-accounting defects are corrected before new calibration.
- Post-theatrical bid value is reviewed so ticket balancing is not undone by oversized automatic second payments.
- Forecast ranges and break-even attendance are available before large commitments; commercial failure is possible without disproportionate cameo/actor punishment.

## 10. Final design acceptance cases

| Controlled case | Intended behavior to verify |
|---|---|
| Favorite actor with a meaningful role versus a token cameo | Relevant, bounded awareness and interest differences; no new people created |
| Actor fans, studio fans and franchise fans overlap | Audience union stays finite; one viewer can buy paid repeats but is not three fresh people |
| Immersive film with high satisfaction | Higher paid repeat interest when money, time and shows allow |
| Strong home-watch preference | Lower theater urgency can coexist with good audience reception; later views obey real windows |
| No signed streaming release | No invented premiere, no immediate stream revenue or guaranteed deferred conversion |
| Liked earlier films and meaningful connected event | Earned event advantage, broader urgency and possible exceptional gross |
| Same event with weak payoff or repetition fatigue | Big opening can weaken; no guaranteed hit |
| Unknown but strong indie with a small campaign | Plausible launch and bounded discovery; profitable limited release remains possible |
| Unknown film with zero exposure | Quality cannot directly recruit an informed worldwide audience |
| Established fanbase with little paid marketing | Organic awareness can sustain a real opening |
| Added budget or one extra dollar crossing a tier | No disproportionate jump in audience or earnings |
| World record gross and strong remaining demand | Continues while viable; no special $3B exit |
| IMDb audience card and financial report | Same committed evidence, distinct experience and money labels |
| Future owned cinema plus owned film | Same ticket, correctly split and consolidated cash; no doubled group revenue |
| Same save/week replay or different project iteration order | Same committed market facts; no duplicate charges/payments |

Calibration should cover the whole production → campaign → first viewing → repeat/discovery → theater exit → streaming window → rights/payment path. Test different budgets, genres, life stages, incomes, countries, career stages, competition and franchise histories. No proposed hit/flop distribution or future performance threshold has been verified yet.

## 11. Fame, stature and reputation: reuse signals without inventing fans

Current source supplies actor `stats.fame`, tier, followers and career data; player studios have calculated prestige, brand health and genre reputation; ecosystem streaming operators have brand power and prestige. They do not constitute one interchangeable worldwide popularity percentage.

| Signal | Permitted role | Prohibited shortcut |
|---|---|---|
| Actor fame and followers | Bounded initial recognition, geographically weighted by available evidence | Adding every actor's followers as distinct ticket buyers |
| Tier, stature and craft | Package credibility, casting fit, expectation and performance inputs | A second automatic global revenue multiplier for the same fame |
| Studio prestige / genre reputation | Cohort-specific credibility, initial familiarity where a career exists | Treating a new studio's default healthy brand score as existing worldwide awareness |
| Streaming brand and catalogue | Credible campaign/catch-up channels where the audience actually has access | Turning subscribers into guaranteed cinema attendance |
| Delivered viewing history | Favorite actor/studio/character attachment, trust and fatigue | Creating affection merely because a famous name was hired |

Normalize `actorId`, `npcId` and player identity to one canonical credited-person identity. Deduplicate credits and weight meaningful participation. Fame can help sell an opening before people know the film's quality; weak delivery should then reduce recommendations, repeats and staying power. No requirement says a famous weak film must have a zero opening.

For legacy careers with incomplete viewing history, seed conservative recognition from verified career/fame signals and explicitly estimated familiarity. Do not claim that the game knows each person's favorite actor from a global fame number alone.

## 12. Worldwide access cannot create free global awareness

The current release screen saves region and chain selections. It does not currently save a city-by-city theatrical booking list. Map those real inputs to country-level supply now and keep an optional location identity in the supply contract for future cities; do not present invented city precision.

Selecting a region/chain requests access to a feasible share of its shows. It does not reserve every screen for every simultaneous film, create a marketing campaign, increase an intrinsic film-quality stat, or set audience awareness to 100.

A local cinema listing or poster may generate modest discovery through actual local footfall. That is a separate exposure event with a bounded audience and one source identity. A chain's worldwide footprint is not a free worldwide campaign. Posters and paid chain promotions, if included in the booking terms, must have explicit reach and cost treatment.

The causal route is:

~~~mermaid
flowchart LR
    P[People, budgets and tastes] --> A[Actually aware and interested]
    E[Campaigns, recognition and discovery] --> A
    A --> C[Choose cinema, wait or skip]
    S[Available countries, shows and prices] --> C
    C --> T[Affordable paid tickets]
    T --> G[Public gross and reconciled shares]
~~~

Availability gates and limits purchases. Exposure creates awareness. Audience fit, expectations, event urgency and price affect conversion. Delivered satisfaction drives future word of mouth and paid repeats. Production spending pays for the package; it is not a direct ticket generator.

Concrete invariant: with awareness, prices, interest and the competitive slate fixed, adding seats to an already non-binding capacity cannot increase paid admissions. Removing a real access bottleneck can increase admissions. Adding a new market can legitimately add attendance only when people there have credible awareness, access, interest and money.

A $50M film earning $500M is permitted when real demand supports it. Repeated $500M results caused only by checking all release regions are a failed balance case. A $200M spectacle has neither a guaranteed floor nor a budget-derived ceiling.

## 13. Replace vague Greenlight buzz with a causal forecast

The present wizard adds script hype, a sequel bonus, director fame, strongest cast fame and music, then clamps one number. The release preview separately multiplies a budget-based demand by screen reach, region reach, distribution power, hype and fame. Those overlapping shortcuts must not survive behind a new label.

Use three distinct readings:

1. **Attention potential:** the package's ability to attract attention, given known cast, story, relevant universe history and music. This is an index/estimate, not a percentage of the world who already know the film.
2. **Current awareness:** persisted country/cohort exposure from actual announcements, organic recognition, campaigns and discovery. A private Greenlight preview creates none.
3. **Theater intent:** price- and audience-dependent interest and urgency, shown as a forecast range. At release, delivered quality and observed modeled response replace uncertain production expectations.

All film campaigns and career promotions produce deduplicated exposure events with source IDs and dates. Apply marketing saturation to reachable unaware people; use overlap across stars, media and channels. Budget, actor fame, soundtrack and universe history must not each pay out repeatedly through several independent versions of buzz.

The Greenlight and release screens call the same pure market kernel as live settlement with a forecast-safe input projection. Forecasts use only player-visible information and uncertainty bands; hidden final production quality must not leak through a preview. Previewing creates no persistent audience history, spending, contract or cash changes.

Replace the equipment-driven quality saturation with continuous, bounded contributions and diminishing returns. Keep script, cast, direction, crew, fit and production execution meaningful. More equipment alone must not make ordinary craft a near-certain perfect film. Budget bands remain labels/production inputs, without dollar-boundary ticket cliffs.

## 14. Shared market, accounting and data boundaries

Create focused modules under `services/boxOffice/`; keep `processGameWeek` as an adapter/orchestrator, not a second mathematical engine. Shared genre/persona definitions may be extracted from streaming only with unchanged streaming regression outputs.

The market takes one frozen world/week snapshot, every eligible title, the bounded cohort histories and the common supply. It produces one deterministic result. Use stable sorting and keyed random draws by world seed, absolute week, title, cohort and decision; a different project iteration order must not change the winner of a market.

Within each cohort, jointly allocate first visits and repeats across titles against the same money, time and seats. Retain an outside option; there is no requirement to spend the full entertainment budget. Keep cinema and streaming participation budgets conserved; waiting is a preference/intent, not money transferred into a second wallet. Any future cross-category transfer requires one explicit budget rule.

Automatic modeled ticket prices derive from the country economy/calendar, chain tier and format. Supply includes country/chain, optional future location, screens, seats, show times/runtime, formats, terms and accessibility. All film footprints share physical capacity. Booking costs are charged only when an actual booking event is committed; first trace current charging so no existing paid fee is charged twice.

Aggregate integer cents at the new accounting boundary. Player-facing existing dollars convert using 100 cents per dollar; existing NPC studio millions convert using 100,000,000 cents per million. Assert safe integers. One ticket gross splits into exhibitor and rights-holder/distributor receipts; signed shares, investors and actor backend are downstream allocations, not extra public gross. Refunds, advances, minimum guarantees and already-paid amounts need their existing contract semantics preserved.

One ledger distinguishes production cost, paid marketing, booking/localization, theater gross, producer receipts, soundtrack income, streaming income and talent participation. Gross rank is separate from cost recovery and profit. Use the same financial facts for cards, outcomes and business cash; do not apply inconsistent 50% estimates or merge theater/streaming by choosing only one.

Run continuation is country/chain-specific, based on occupancy, remaining demand, discovery grace and competing films' opportunity cost. No universal monetary stop event. The new engine has physical and affordability constraints, not a replacement hidden lifetime cash cap.

Post-theater bids must use the buyer's reachable incremental viewing/retention value, rights/window, overlap, spending capacity and risk. Theater success can be evidence of value; a production-budget floor or an automatic multiple of theatrical gross is not a justified guaranteed second reward. Preserve already-signed deals and use one canonical rights settlement.

## 15. Existing-save transition and execution safety

Preferred policy: activate the new engine on the next unprocessed week for new releases and active, not-fully-settled theatrical releases. Keep all historic gross, receipts, paid costs and signed deals immutable. Do not retroactively reclaim old earnings or pay compensation based on a recalculated old run.

For an active legacy title, derive conservative country/cohort seen-history estimates from its historical gross, known footprint and modeled historical ticket prices. Limit the estimated history to reachable population, mark it `LEGACY_ESTIMATE`, and never pay it. Start exact new-engine admissions/unique/repeat counters at activation. Lifetime audience presentation distinguishes that estimate from tracked attendance; it must not display reconstructed counts as exact facts.

NPC films whose old one-shot lifetime result was already fully booked remain settled historical releases. Their old synthetic weekly curves may remain clearly identified chart history; those curves do not request a second set of new-engine tickets or cash. NPC projects not yet settled use the shared weekly engine. Canonical title IDs and settlement-basis flags prevent an old record from entering both paths.

Store one `worldCinemaMarket` state with schema version and tuning version, a committed absolute-week key, per-title bounded active histories and compact settled facts. Persist the version used by each result. Retain compact actor/studio/universe affinity aggregates after a title closes; retire inactive title/cohort matrices rather than keeping the full history forever. Migrate absent, partial, future/invalid and reloaded states explicitly; unsupported future schemas leave the save intact and stop that migration with a recoverable diagnostic.

Use the current checkout only with a fresh baseline/checkpoint manifest and selective patches. Preserve the unrelated streaming work. Once a phase is live, rollback must restore its code and compatible save state together; never run old code against a newer schema without its compatibility gate.

## 16. Non-negotiable additional acceptance cases

| Case | Required evidence |
|---|---|
| Same aware audience, extra unused seats | Identical tickets; awareness unchanged |
| Worldwide selection alone | No awareness=100 assignment, fabricated campaign or unconditional sales floor |
| Two famous leads, zero paid campaign, weak versus strong delivery | Credible organic opening; weak delivery loses repeat/recommendation/hold advantage across controlled seeds |
| New studio with default brand health | No invented established worldwide fanbase |
| Same people follow two actors and the studio | Union stays within cohort population; duplicate cast IDs do not improve reach |
| Focused versus worldwide release of the same low-awareness title | Costs, bottlenecks and real exposure explain the difference; wider access alone does not ensure profit |
| Marketing to the same audience again | Declining net-new reach; no infinite refresh of unaware people |
| Greenlight forecast after changing hidden final quality | Same forecast when visible inputs are unchanged |
| Forecast versus live kernel with identical complete inputs | Same constraints and allocations; preview has no side effects |
| Active legacy save and already-settled NPC release | Historic cash/gross retained; estimated audiences labeled; no double payment |
| $120M versus $120M+1 with all audience inputs fixed | No ticket/revenue cliff |
| Reordered slate, save/reload and retried week | Same results and one settlement |

## 17. Six execution phases and decision gates

| Phase | Deliverable | Gate |
|---|---|---|
| 1. Trustworthy inputs and money | Cast/owner identity repairs, continuous inputs, single cost/receipt facts, baseline evidence | Reported source defects have focused reproductions; historic ledgers preserved |
| 2. Awareness and forecasts | Fame/reputation normalization, campaign reach, Greenlight attention/awareness/intent, forecast-safe projection | Worldwide checkbox and duplicate-fame exploits fail; hidden quality cannot leak |
| 3. Shadow shared cinema market | Cohort choice, paid repeats, waiting, loyalty, earned universe events, country prices and shared shows | Population, wallets, time, seats and sum-of-shares invariants hold; no shadow money |
| 4. Live integration and saves | Same player/offer/NPC weekly result, natural runs, migration and exactly-once money | Full week/reload/ownership paths pass; no old one-shot plus weekly double reward |
| 5. Player surfaces and streaming handoff | Shared release preview, financial reports, audience insights, rights-aware downstream bids | Normal UI and theater-to-streaming path agree with committed facts |
| 6. Calibration and release verification | Contrasted seeded cases, real career journeys, long-save and measured performance evidence | Hard invariants pass; outcome ranges reviewed; untested devices/flows remain explicitly unverified |

Execute inline with one owner of the shared world/week/accounting changes. A separate simultaneous implementation of Greenlight, NPC, streaming and theatrical money would multiply integration risk before the common contracts exist. The user delegated the execution approach; no additional choice prompt is needed. Read-only review can be used when useful, but it is not a dependency of this plan.

The implementation plan is [Fair Box Office Implementation Plan](</Users/zeesh/Vibe code/Actor empire/docs/superpowers/plans/2026-10-22-fair-box-office.md>). Phase 1 foundations are implemented; the shared audience market and later phases remain inactive. The preliminary five-step outline is superseded by these six gated phases.

## Evidence pointers

- [Genre/persona and title-fit scoring](</Users/zeesh/Vibe code/Actor empire/services/worldEconomy/worldStreamingViewing.ts:609>)
- [Discovery channels](</Users/zeesh/Vibe code/Actor empire/services/worldEconomy/worldStreamingViewing.ts:724>)
- [Existing repeat/completion calculation](</Users/zeesh/Vibe code/Actor empire/services/worldEconomy/worldStreamingViewing.ts:979>)
- [Catalogue diminishing returns and premiere age](</Users/zeesh/Vibe code/Actor empire/services/worldEconomy/worldStreamingContentValue.ts:18>)
- [Finite choices and overlapping access](</Users/zeesh/Vibe code/Actor empire/services/worldEconomy/worldStreamingAudienceChoice.ts:52>)
- [Current platform loyalty proxy](</Users/zeesh/Vibe code/Actor empire/services/worldEconomy/worldStreamingOffers.ts:245>)
- [Marketing awareness and saturation](</Users/zeesh/Vibe code/Actor empire/services/streamingLaunchMarketing.ts:225>)
- [Fandom identities and size](</Users/zeesh/Vibe code/Actor empire/services/industryWorld/industryMediaFandoms.ts:105>)
- [Fandom growth and loyalty updates](</Users/zeesh/Vibe code/Actor empire/services/industryWorld/industryMediaFandoms.ts:658>)
- [Universe event/familiarity helper](</Users/zeesh/Vibe code/Actor empire/services/industryIntelligence/industryUniverseBlueprint.ts:93>)
- [Novelty and continuity fatigue](</Users/zeesh/Vibe code/Actor empire/services/industryIntelligence/industryContentNovelty.ts:27>)
- [Canonical universe owner/history fields](</Users/zeesh/Vibe code/Actor empire/types.ts:8353>)
- [Country/time content availability](</Users/zeesh/Vibe code/Actor empire/services/streamingContentAvailability.ts:300>)
- [Current reception's gross-dependent score](</Users/zeesh/Vibe code/Actor empire/services/audienceReception.ts:122>)
- [Existing IMDb audience panel](</Users/zeesh/Vibe code/Actor empire/views/mobile/ImdbApp.tsx:1318>)
- [Original WE9 cinema adapter direction](</Users/zeesh/Vibe code/Actor empire/docs/superpowers/specs/2026-09-09-world-economy-audience-master-roadmap.md:281>)

## Current-source checks in this refinement

Passed: WE6 streaming viewing audit, universe-blueprint audit, fandom state/formation audits, content novelty audit, and streaming marketing forecast/lifecycle audits. The existing WE6 audit completed its 400 annual checkpoints and save/reload assertions; this tests the current streaming engine, not proposed cinema performance or economics.

No new theatrical/loyalty/deferral engine has been implemented or certified by these checks. The source-traced reuse assessment and design are the deliverables of this refinement.
