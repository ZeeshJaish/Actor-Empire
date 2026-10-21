# Fair box office: refined audience and cinema design

22 October 2026. Consolidated proposal for final discussion, building on the [current-system audit](report.md) and [initial brainstorm](revamp-brainstorm.md).

The user approved the shared-market direction and requested repeat attendance, favorite actor/studio behavior, streaming deferral, earned universe events, believable small-film discovery, broader reuse of existing systems, and a foundation for future cinema-chain ownership. This is design work; no gameplay implementation is included.

Confirmed decisions:

- Ticket prices are automatic by country and cinema chain.
- Budget/earning amounts in the conversation were examples, not proposed fixed caps.
- Earnings come from the actual modeled audience, spending and cinema market.
- Full series/rating bugs will be triaged separately when the user supplies those reports. IMDb audience insights are included here; a numerical-rating redesign is a separate decision.

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

## Work sequence after final design agreement

1. Repair current input/settlement defects and define canonical cost/outcome facts.
2. Build/adapt shared audience experience, affinity, discovery and availability inputs; keep cinema-specific decisions separate from subscription-specific rules.
3. Calculate a shadow cinema market with first/repeat/deferred behavior, automatic prices, competition and shared capacity. No shadow cash payouts.
4. Connect one live weekly settlement for player/NPC titles, natural country runs, histories, forecasts and IMDb audience insights, with an explicit existing-save transition policy.
5. Calibrate realistic conditional outcomes and the theater-to-streaming economy; verify actual career/UI flows, migration, persistence, long-run state size and measured weekly performance.

This sequence is a design outline. It is not an instruction to start implementation before the final scope is agreed.

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
