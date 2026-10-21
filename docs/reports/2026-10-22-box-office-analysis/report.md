# Current box-office system analysis

Date: 22 October 2026. Repository HEAD: `612efbb1cb6c80a22d1ba30fde4a1d88f90cdc4e`, version `1.0.25`, including the current local working tree.

Scope: theatrical box office, studio receipts, actor rewards, release inputs, caps, outcomes, and the immediate post-theatrical sale. IMDb is not audited; the existing rating is retained only where box-office code already consumes it. No gameplay source or player saves were changed.

## Verdict

The reports have credible technical causes. The current system can make a developed studio very rewarding while giving accepted acting offers an unfairly weak package. These are several interacting problems, rather than one revenue multiplier that needs reducing.

The strongest findings are:

1. Accepted offers can retain a cast containing only the player. Release initialization skips co-star generation because that list exists, then penalizes the big film for a thin cast.
2. The same cash budget receives different tiers across offered films and player productions. This changes both the opening ceiling and the risk penalty.
3. Greenlight quality can saturate at 100, and repeated weekly multipliers can turn strong films into cap-seeking runs.
4. Cap clipping can make studio + exhibitor receipts exceed the recorded ticket gross. This is a reproduced accounting defect.
5. Hit/flop labels and displayed ROI do not consistently measure studio profitability.
6. Regions and rivals do not form a shared theatrical audience economy; several apparently detailed metrics are allocation or presentation layers.

There is no universal fixed $300M or $3B lifetime wall in current source. There are still explicit tier ceilings, with dynamic adjustments. A prepared actual weekly-loop run exceeded $3B.

## Evidence and limits

- Source tracing covered offer generation/acceptance, Greenlight calculations/builder, release initialization, weekly demand, risk, distribution, settlement, withdrawal, archive/UI, and rival commercial results.
- The included harness ran eight scenarios of 500 samples each: **4,000 controlled theatrical runs**. It calls the current production functions and mirrors theatrical ordering, clipping, pull rules and extensions.
- It also ran `processGameWeek` directly for six prepared releases, followed by two accepted-offer release handoffs. These confirmed stored receipts, transitions, missing cast completion, and cap accounting mismatches in the actual loop.
- The samples are conditional experiments, not measured player success rates. Sampled offered-film cases fix genre to ACTION, player fame to 50, performance to 75 and the rating input to 7.5. Studio scenarios use specified packages; they are not randomly chosen player careers.
- Formula runs omit soundtrack income, charity, marketing-reality edits, production events and save migration. Actual weekly-loop checks include normal weekly processing but start from prepared states, not a complete career or a fresh Greenlight UI journey.
- No live player save, user-supplied film, store binary, or production telemetry was inspected. No browser screenshot verification was performed. UI findings below are source-verified.
- Imported NPC initialization, random draws and clock-based IDs are seeded by `run.mjs` for reproducibility. Re-run from the repository root with `node docs/reports/2026-10-22-box-office-analysis/run.mjs`.

Artifacts: [harness](audit.ts), [deterministic runner](run.mjs), [full numerical results](results.json).

## 1. How a film reaches box office

| Stage | Current behavior | Source |
|---|---|---|
| Offered project | Budget and hidden package are randomly generated from the offered tier. HIGH budgets are $120M–$300M. | [roleLogic.ts](</Users/zeesh/Vibe code/Actor empire/services/roleLogic.ts:695>) |
| Player production | Budget is assembled from resources, talent and music. Tier comes from cash thresholds. Quality is estimated, then actual quality receives ±10 points. | [greenlightProjectBuilder.ts](</Users/zeesh/Vibe code/Actor empire/views/lifestyle/business/greenlightProjectBuilder.ts:180>) |
| Release preparation | Computes campaign reach from spending, stars/hype and distribution; stores regions/chains, campaign and date. | [ReleaseWizard.tsx](</Users/zeesh/Vibe code/Actor empire/views/lifestyle/business/ReleaseWizard.tsx:1492>) |
| Release initialization | Creates missing cast, recomputes fame, derives cast depth, applies music and slate fatigue, prepares opening buzz and run length. | [gameLoop.ts](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:4225>) |
| Weekly theatrical calculation | Raw opening/hold → production risk → charity goodwill → dynamic cap headroom → distribution adjustment → regional/chain receipts. | [gameLoop.ts](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:5194>) |
| Cash settlement | Studio receives its chain share, less investors; talent participation is settled separately. Public gross includes cinema receipts. | [gameLoop.ts](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:5350>) |
| Run ends | From week 3, pull if weekly gross falls below 5% of production budget; otherwise time limit/extensions determine exit. | [gameLoop.ts](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:5328>) |
| After theaters | Owned films enter a streaming bidding process. Offered films auto-route to a platform if acquisition can be funded. | [gameLoop.ts](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:5485>) |

### Opening and subsequent weeks

Opening starts with **production budget × hype × distribution × promotional buzz × package × quality × fame**, followed by cast depth, studio prestige/specialization, format, market demand, music, campaign reach, random variance and genre. It is then clamped to a tier opening anchor. Risk and distribution adjustments happen afterward, so the final recorded opening can exceed that anchor. [Opening calculation](</Users/zeesh/Vibe code/Actor empire/services/roleLogic.ts:1294>)

Later weeks start from **the previous week's final distributed gross**, not a fresh audience pool. Retention is based on quality bands, genre, script/director, casting depth, music, rare sleeper rules, random variance and run age. Format, market demand and studio specialization multiply that retained gross. The outer weekly loop then applies risk and distribution again. [Hold calculation](</Users/zeesh/Vibe code/Actor empire/services/roleLogic.ts:1375>)

Quality bands use strict boundaries: above 90 starts at a 30% drop, above 80 at 40%, above 60 at 50%, 50–60 at 55%, below 50 at 65%, and below 30 at 70%. Script/director and other effects modify these rates. Small quality changes around a boundary can materially change the entire remaining run.

## 2. Caps: what is actually implemented

| Budget tier | Raw opening anchor | Lifetime base anchor | Exceptional dynamic example |
|---|---:|---:|---:|
| LOW | $30M | $170M | $222.48M |
| MID | $120M | $600M | $785.23M |
| HIGH | $350M | $1.75B | $2.771B |
| BLOCKBUSTER | $600M | $2.65B | $4.506B |

The last column is a ceiling calculation, not earnings. It uses script 96, director 94, casting 95, distribution 96, quality 95, hype 97, fame multiplier 1.5, demand 1.15, genre reputation 80 and cap roll 0.98. [Caps and dynamic calculation](</Users/zeesh/Vibe code/Actor empire/services/roleLogic.ts:1200>)

- Lifetime ceilings vary with package, genre/format, a persisted random roll, current market demand and owned-studio genre reputation. Thin high-budget spectacle gets a further ceiling reduction.
- The cap roll persists, but the ceiling is recomputed weekly. A colder market can lower it below already-earned gross; existing gross remains, and later weeks can receive zero headroom.
- A qualifying mega-event can stretch the raw opening ceiling to 1.2–1.44 times its anchor. Risk, goodwill and distribution follow that raw clamp.
- In the real weekly-loop fixture, a $180M elite BLOCKBUSTER earned **$3.289B theatrical gross**. Thus a fixed $3B wall was not reproduced.
- The conditional elite $180M specialist scenario exceeded $3B in 98% of its 500 samples and reached at least 99% of its final cap in every sample. Exceptional inputs can make a supposedly rare ceiling behave like the destination of an ordinary run for that package.

## 3. Accepted acting offers: missing co-stars become commercial penalties

**Classification: reproduced integration defect; strong explanation for the offered-role complaint.**

`applyOpportunityIdentityToProject` inserts the player's character into the cast. Most newly generated offers have no existing cast, so acceptance produces a one-member list. Both normal role acceptance and multi-film universe acceptance use that helper. At release, the weekly loop calls `generateCastList` only when `castList` is absent. An existing singleton list bypasses it. [Identity helper](</Users/zeesh/Vibe code/Actor empire/services/characterIdentityLogic.ts:301>), [acceptance paths](</Users/zeesh/Vibe code/Actor empire/views/mobile/MobilePage.tsx:447>), [release guard](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:4235>)

For a large ACTION/SUPERHERO package, this can stack:

- Low cast-depth modifier on opening.
- Another thin-spectacle opening penalty.
- Extra weekly drop.
- Thin-spectacle production-risk drag.
- A reduced lifetime ceiling.
- Missing co-star fame.

Actual helper → actual release initialization → actual weekly-loop comparison:

| Same $210M universe offer | Cast entries | Depth | Theatrical gross | Studio receipts | Commercial outcome |
|---|---:|---:|---:|---:|---|
| Accepted offer as currently constructed | 1 | 10/100 | $296.63M | $156.64M | NEUTRAL |
| Comparison with `generateCastList` populated first | 8 | 96/100 | $485.39M | $256.34M | SUCCESS |

The fallback list includes a director entry, which is also counted by the current depth call. The comparison is diagnostic, not a proposed final cast design. The first film is neutral under the game's gross-based verdict while its studio receipts remain below its $210M production budget.

The 500-sample accepted singleton ACTION scenario produced 45% FAILURE/MAJOR_FAILURE outcomes and 72.2% of runs with theatrical receipts below production cost. A deliberately populated ensemble control reduced those figures to 14.6% and 43.6%. These are conditional experiments with different downstream random consumption, not a production flop-rate estimate.

## 4. Budget-tier mismatch and threshold jumps

**Classification: source-verified inconsistency with measured economic impact.**

| Route | LOW | MID | HIGH | BLOCKBUSTER |
|---|---|---|---|---|
| Ordinary generated offers | $0.5M–$5M | $20M–$80M | $120M–$300M | No case in `getEstimatedBudget` |
| Player production | ≤$12M | >$12M–$45M | >$45M–$120M | >$120M |
| Risk anchor | $8M | $35M | $90M | $180M |

Sources: [offer budgets](</Users/zeesh/Vibe code/Actor empire/services/roleLogic.ts:695>), [player tiers](</Users/zeesh/Vibe code/Actor empire/services/studioProductionEconomy.ts:11>), [risk anchors and budget drag](</Users/zeesh/Vibe code/Actor empire/services/productionRisk.ts:24>).

A $210M offered HIGH film is assessed against a $90M risk anchor; a $210M owned BLOCKBUSTER uses $180M. Risk is applied every theatrical week, so this difference affects opening and compounds through the remaining run.

With identical package, cash budget, fixed random draws, stable demand and no specialization, changing only HIGH → BLOCKBUSTER produced:

| $210M controlled package | HIGH | BLOCKBUSTER |
|---|---:|---:|
| Lifetime theatrical gross | $496.36M | $1.496B |
| Studio receipts | $256.05M | $771.50M |
| Weeks before withdrawal | 5 | 8 |

This does **not** justify reclassifying every offer as the fix: that would greatly boost already-generous revenue. Tier definitions, risk anchors, opening scale and lifetime behavior need joint calibration.

There are also sharp player-budget cliffs. Under one unchanged package, increasing $120,000,000 to $120,000,001 changes the tier and moves gross from $802.60M to $1.892B. At $12M and $45M boundaries there are similar discontinuities. A one-dollar spend should not mechanically buy a much larger market.

## 5. Why developed player studios can become so rewarding

### Quality reaches its maximum too easily in developed setups

The Greenlight score adds contributions with weights 0.5 script, 0.4 director, 0.3 casting and 0.2 crew around a base of 50, then adds gear, locations, story fit and background benefits. These weights are additive and sum above one. Four level-10 owned equipment lines alone add 30 points. [Quality calculation](</Users/zeesh/Vibe code/Actor empire/views/lifestyle/business/greenlightCalculations.ts:244>)

With script/director/cast/crew all at 70, four level-10 equipment lines, one location of quality 8 and neutral story/background adjustments, **estimated quality reaches 100**. The same happens at 80 and 90 inputs. Actual quality then starts at 90–100 after the ±10 variation and clamping. This compresses distinctions between good, excellent and exceptional films. [Actual-quality roll](</Users/zeesh/Vibe code/Actor empire/views/lifestyle/business/greenlightProjectBuilder.ts:233>)

This is an economic balance issue in those prepared resource conditions, not proof that every founder can cheaply reach them. Infrastructure and per-project resource charges do exist and must remain part of affordability analysis.

### Weekly modifiers compound

Ordinary strong-package controls use $90M, ACTION, craft/quality 75, fame multiplier 3, depth 85, hype/distribution 80, buzz 80 and campaign reach 1. The elite control changes craft/quality to 95. Stable-demand fixed-random results:

| Controlled condition | Week-two / week-one gross | Final gross |
|---|---:|---:|
| Strong commercial support, quality 75 | 58.24% | $928.47M |
| Same, hot demand 1.28 | 74.55% | $1.353B |
| Same, cold demand 0.78 | 45.43% | $707.27M |
| Quality 95, otherwise same support | 102.51% | $2.243B |
| Quality 95 + hot demand + genre reputation 100 | 149.59% | $2.363B |

The growing elite runs do not use the rare LOW/MID sleeper rule. Growth emerges because normal retention is multiplied by repeated market, specialization, risk and distribution lifts. There is no shared attendance exhaustion or remaining-viewer pool stopping it before cap headroom does.

### The wider conditional sample

These figures use live genre trends, randomized cap rolls and weekly variance. They hold the other specified package inputs fixed.

| Prepared scenario, 500 each | Median gross | P10–P90 gross | Median studio receipts / production budget |
|---|---:|---:|---:|
| Accepted HIGH ACTION offer, singleton cast | $276.53M | $208.61M–$414.80M | 0.67× |
| HIGH offer, populated ensemble control | $462.12M | $294.27M–$758.78M | 1.13× |
| Same ensemble design, BLOCKBUSTER tier control | $1.341B | $985.03M–$2.172B | 3.34× |
| $90M quality-40 film with strong stars/launch support | $247.09M | $208.11M–$283.58M | 1.42× |
| $90M quality-75 film with strong stars/launch support | $820.10M | $775.20M–$865.96M | 4.70× |
| $90M quality-95 film with strong stars/launch support | $2.235B | $1.894B–$2.522B | 12.90× |
| Same elite film, genre reputation 100 | $2.387B | $2.023B–$2.694B | 13.84× |
| $180M elite BLOCKBUSTER, genre reputation 100 | $3.652B | $3.095B–$4.121B | 10.62× |

The receipts multiples are before marketing, investor/talent payouts and overhead. Some cap-bound receipts contain the accounting mismatch described next; they must not be treated as reconciled profits.

## 6. Cap settlement can create receipts above ticket sales

**Classification: reproduced accounting defect in actual `processGameWeek`.**

The loop first computes distribution-adjusted gross, clips that gross to remaining cap headroom, then calls the distribution engine again with the already-final clipped amount. That second call applies the reach multiplier again. The loop records the clipped amount as weekly gross but stores/pays the second call's studio/cinema receipts. [Clipping and recalculation](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:5247>), [distribution multiplication](</Users/zeesh/Vibe code/Actor empire/services/distributionRevenue.ts:209>)

Actual-loop prepared results:

| Release | Recorded theatrical gross | Studio + cinema receipts | Excess receipts |
|---|---:|---:|---:|
| Elite HIGH | $2,211,818,965 | $2,222,299,185 | **$10,480,220** |
| Elite BLOCKBUSTER | $3,289,015,517 | $3,322,695,833 | **$33,680,316** |

These are total studio-plus-cinema discrepancies; the studio alone receives its portion. Non-cap-bound controls reconciled exactly. An initial strict accounting assertion failed here; the harness now records the defect explicitly while preserving gross-history and internal allocation checks. No production fix was applied.

Expected invariant for a future fix: every week's final gross must equal final studio receipts plus final exhibitor receipts, including the last capped week. Allocation should split an already-final gross without increasing demand again.

## 7. Geography and competition are shallower than the UI suggests

### Regions distribute a precomputed global number

The engine chooses a worldwide gross demand first, applies a bounded distribution modifier of 0.62–1.12, then allocates the result across selected regions/chains. Screens and expected footfall influence that small multiplier; there is no hard admissions capacity, ticket-price settlement or remaining-viewer budget. [Distribution calculation](</Users/zeesh/Vibe code/Actor empire/services/distributionRevenue.ts:140>)

At identical $100M demand, one North American chain with 1,768 screens returned **$86.67M**, while six regions/default partners with 17,755 screens returned **$112M**. This is about 77% of worldwide gross on about 10% of the screens. It demonstrates that a narrow footprint does not constrain revenue proportionally to available screens/audiences.

Regional hold and chain volatility change allocation weights, but their sum is normalized back to the chosen worldwide gross. With the same demand/footprint, week 1 and week 8 both produced $112M despite every region's hold having changed. Those holds do not directly reduce worldwide gross; they can change its mix and weighted studio share. [Hold and weights](</Users/zeesh/Vibe code/Actor empire/services/distributionRevenue.ts:129>)

### Rivals do not consume a shared theatrical market

- Player-attached releases receive an opening-buzz clash penalty from projects released in the same week: 5 per title plus another 15 for each HIGH rival. BLOCKBUSTER is not counted as a heavy hitter by that condition. The query also compares week number without a release-year filter. [Clash penalty](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:4415>)
- There is no weekly same-genre audience cannibalization or shared screens settlement inside the theatrical engine.
- Current independent Studio AI releases use a separate one-shot commercial formula based on budget, release mode, commercial potential and random variance. Their receipts assume 48% of theatrical gross, and their outcome deducts production/marketing/backend. [Studio AI result](</Users/zeesh/Vibe code/Actor empire/services/studioAi/studioAiCommercialResult.ts:29>)
- The weekly Box Office market chart reconstructs rival opening/hold curves from their final `boxOffice` result; it does not display an equivalent stored weekly theatrical settlement. [Chart projection](</Users/zeesh/Vibe code/Actor empire/views/mobile/BoxOfficeApp.tsx:351>)
- Legacy `generateIndustryProject` and `processUniverseTurn` formulas remain in source, but no active production callers were found. Their easier historical gross formulas were not used as evidence for the current core rival pipeline.

Thus player-produced films, player acting jobs and independent rivals are not fully comparable participants in one economy.

## 8. Verdicts, receipts and ROI disagree

| Surface | Metric and rules |
|---|---|
| Run consequence | `(theatrical gross + soundtrack) / production budget`: >3× MASSIVE_SUCCESS; >2.2× SUCCESS; <0.6× MAJOR_FAILURE; <1.2× FAILURE; otherwise NEUTRAL. A rating above 8 upgrades FAILURE to NEUTRAL. |
| Studio business outcome | Gross-based revenue / budget: ≥4× MEGA_HIT, ≥2.15× HIT, ≥1.25× SOLID, with rating-based upgrades; lower results become MISS/FLOP/BOMB. This drives momentum, confidence, brand and hype. |
| Studio dashboard badge | Theatrical gross >5× budget = Blockbuster; >2× = Hit; <1× = Flop; otherwise Average. |
| Weekly chart tag | A weekly gross of $100M or 55% of budget qualifies as Blockbuster; later falling weeks can receive Flop Watch. These describe weekly movement, not final profitability. |
| Ordinary dashboard ROI | `(public theatrical gross + streaming + soundtrack - production budget) / production budget`; it includes exhibitor money and omits marketing/backend/overhead. |
| Box Office archive ROI | Studio receipts / production budget, a recovery multiple rather than profit percentage. |

Sources: [run verdict](</Users/zeesh/Vibe code/Actor empire/services/roleLogic.ts:1430>), [dashboard calculations](</Users/zeesh/Vibe code/Actor empire/views/lifestyle/business/components/ProjectDashboardModal.tsx:365>), [badge](</Users/zeesh/Vibe code/Actor empire/views/lifestyle/business/components/ProjectDashboardModal.tsx:754>), [ROI display](</Users/zeesh/Vibe code/Actor empire/views/lifestyle/business/components/ProjectDashboardModal.tsx:1004>), [weekly tag](</Users/zeesh/Vibe code/Actor empire/views/mobile/BoxOfficeApp.tsx:424>), [archive](</Users/zeesh/Vibe code/Actor empire/views/mobile/BoxOfficeApp.tsx:557>).

The studio business result has another set of thresholds, rather than reusing the run verdict. It receives public-gross-based revenue, so an apparent hit can improve studio confidence/brand despite unrecovered cash costs. Its processed-project key prevents a second result at streaming completion, while the final archive can change its outcome after that income. [Business outcome](</Users/zeesh/Vibe code/Actor empire/services/businessLogic.ts:468>), [once-per-project application](</Users/zeesh/Vibe code/Actor empire/services/businessLogic.ts:569>).

Illustrative arithmetic: $100M production + $30M marketing, $230M tickets and a 50% studio share gives $115M studio receipts and a **$15M loss** before other costs. The core verdict is SUCCESS and the dashboard can show a Hit and +130% ROI. That is a presentation/accounting mismatch, not a difficult-to-explain business success.

Additional source-verified reporting issues:

- The studio dashboard estimates receipts with a hard-coded 50% theatrical share even though actual chain settlement uses variable shares.
- A live hybrid archive entry uses `totalStudioReceipts || streamingRevenue || estimatedGrossShare`, selecting one source instead of adding theatrical receipts and streaming. Past entries have a similar preference chain. Hybrid studio-return comparisons can therefore omit a revenue source.
- Final archive outcomes can include later streaming revenue, so the final outcome may differ from the outcome that already awarded theatrical fame/reputation.

## 9. Actor pay and career rewards

An acting salary is paid at release from the agreed lump sum, subject to agent commission; it does not depend on box-office success. Weekly theatrical fame pulses use gross relative to budget. End-of-run fame, reputation and followers depend on outcome, role and performance. Famous-project multipliers can double some rewards/penalties. [Payday](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:4336>), [weekly fame](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:5337>), [consequences](</Users/zeesh/Vibe code/Actor empire/services/roleLogic.ts:1443>).

For offered roles, negotiated actor royalty is settled after streaming exit using `max(0, theatrical gross - 2 × production budget) × royalty percentage`. It is not the actual studio's net profit after chain splits and marketing. [Royalty settlement](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:6067>)

This means actor salary, movie success, studio profit and backend payout are distinct outcomes. A player can be paid well for a flop, while the film still hurts their reputation. Conversely, their performance cannot fully rescue weak script, scale, distribution or the singleton-cast integration defect.

## 10. Other input inconsistencies relevant to a revamp

- **Fame has no diminishing-return cap.** It is `1 + total fame / 50 + talent contribution`; raw cast fame sums linearly. Player fame is included even when no player cast entry is present. Duplicate IDs are counted repeatedly. Duplicate-cast exploitability was not established. [Fame function](</Users/zeesh/Vibe code/Actor empire/services/npcLogic.ts:1317>)
- **Player-production preview/release schemas differ.** Greenlight writes cast `actorId`; release initialization recomputes cast fame from `npcId` only and overwrites the builder's multiplier. Hired actor/in-house contributions can disappear on this path. This is source-verified; no complete hired-cast UI journey was run. [Builder cast](</Users/zeesh/Vibe code/Actor empire/views/lifestyle/business/greenlightProjectBuilder.ts:330>), [release recomputation](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:4238>)
- **Universe offers inherit ordinary HIGH stats.** `isFamous` and visible HIGH hype do not create a guaranteed commercial hit. The random-universe opportunity helper changes title, universe and genre but does not replace the randomly chosen studio with the universe template studio. The controlled MONSTERVERSE offer was attributed to MARVEL_STUDIOS, although the template specifies WARNER_BROS. [Offer construction](</Users/zeesh/Vibe code/Actor empire/services/universeLogic.ts:1611>), [template](</Users/zeesh/Vibe code/Actor empire/services/universeLogic.ts:487>)
- **Age rating is not a direct theatrical demand limiter.** Changing only G to NC-17 produced identical engine results. It can still affect campaign fit elsewhere; it does not directly restrict the core ticket audience calculation.
- **Calendar labels are not automatic holiday demand boosts.** Holiday impact constants exist, but the theatrical revenue path does not consume their `impact` values. Actual genre market trends still vary by week. [Calendar constants](</Users/zeesh/Vibe code/Actor empire/services/worldLogic.ts:25>), [calendar presentation](</Users/zeesh/Vibe code/Actor empire/views/lifestyle/business/ReleaseWizard.tsx:1663>)
- **Marketing has partial economic integration.** Paid campaign reach directly affects opening. The week-two campaign-reality result updates hype, reputation and narrative but does not directly alter retention; raw hype is not a normal later-week hold input. Some “word of mouth” or “backlash” copy therefore describes a response without an equivalent direct hold effect. Music and the separate rare sleeper logic do affect legs. [Reality application](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:4635>)
- **Studio specialization rises after every release.** Even a low-rated film adds at least one genre-reputation point, and the current helper has no negative branch. That owned-studio advantage can accumulate with volume. [Specialization](</Users/zeesh/Vibe code/Actor empire/services/studioSpecialization.ts:21>)

## 11. Withdrawal and the post-theatrical safety net

Base run ranges are LOW 8–12, MID 10–14, HIGH 12–15 and BLOCKBUSTER 13–16 weeks. Strong holds can add up to six weeks, with an absolute limit of 22. Most controlled ordinary films exited earlier because of the 5%-of-budget weekly threshold. [Run rules](</Users/zeesh/Vibe code/Actor empire/services/theatricalRunLogic.ts:3>)

The pull rule makes expensive films leave sooner even when the weekly absolute gross could look large. A $300M film crosses the pull condition below $15M/week; a $5M film below $250K/week. This is an implemented rule, not automatically a defect, but it amplifies tier/budget-risk differences.

Post-theatrical streaming bids can add a substantial second reward to owned films. Current code starts from budget/package-based floors, uses theatrical proof, and contains fallback bidding paths. Strong theatrical gross can produce an upfront offer approaching or exceeding that gross. In the actual prepared elite $180M fixture, theatrical gross was $3.289B and the highest displayed bid was $3.750B. The bid was not accepted in this audit; it is **an offer, not realized revenue**. [Bid profiles](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:759>), [bid generation](</Users/zeesh/Vibe code/Actor empire/services/gameLoop.ts:5500>)

If users say their “box-office movie” is too rewarding, screenshots should distinguish ticket gross, chain receipts, streaming sale and actual balance increase. This audit covers the bid handoff, not the complete streaming-contract economy or offer acceptance/payment validation.

## 12. What should be preserved, and what needs design work

Existing useful behavior includes separated cinema/studio receipts, region/chain breakdown history, investor and talent participation, persisted cap rolls, meaningful infrastructure costs, varied opening/hold inputs, rare low-budget sleeper paths, slate fatigue, run extensions, and salary separate from studio revenue. Five existing focused audits passed; that did not imply the whole economy was balanced.

Proposed priorities for discussion after the detailed user feedback arrives:

| Priority | Direction | Expected result |
|---|---|---|
| First | Fix final-gross allocation so caps never mint extra receipts. | Every settlement reconciles. |
| First | Complete offered casts before depth/fame evaluation; reconcile actor identity fields and universe studio attribution. | An offered big movie is judged using its actual package. |
| First | Define production budget, total cost, gross, studio receipts, net profit and actor earnings consistently across UI/outcomes. | A label and its money explanation agree. |
| Next | Use coherent cash-scale treatment across offers, owned films and NPCs; remove extreme threshold cliffs. | Ownership route or a one-dollar boundary does not radically change demand. |
| Next | Rework quality saturation and repeated weekly lifts together. | Strong production helps without making maximum commercial upside routine. |
| Next | Decide how regions, capacity, ticket spending, audience overlap and competition should actually constrain demand. | Release choices and rivals have measurable economic consequences. |
| Next | Calibrate lifetime distributions and post-theatrical value jointly, across early/mid/late careers and genres. | Flops, recovery, modest hits, sleepers and rare events all remain possible. |

No numerical replacement targets or implementation phases are approved by this report. Simply reducing all gross would worsen some offered roles while leaving the integration and accounting problems intact.

## Verification record

Passed on current source:

- `npm run audit:box-office-economy`
- `npm run audit:distribution-revenue`
- `npm run audit:studio-production-economy`
- `npm run audit:greenlight-calculations`
- `npm run audit:studio-ai-commercial-result-b6`

The custom harness completed 4,000 formula scenarios, six actual-loop prepared releases and two accepted-offer handoffs. A fresh repeat reproduced `results.json` byte for byte. It records two non-reconciling cap-bound releases as observed defects; completion of the harness is not a passing accounting certification. Existing audits test selected safeguards, not commercial realism or complete acceptance-to-release integration.

No app build was needed for this analysis-only addition. No app fix, browser flow, real-device result, store-release verification or production-rate claim is implied. All previously tracked dirty files were checked for byte preservation before handoff.

## User-feedback mapping for the next discussion

| Reported concern | Current assessment |
|---|---|
| Own studio films are too rewarding | Supported under developed/prepared resource conditions; quality saturation, compounding, cap settlement and later bids contribute. Normal-player frequency remains unmeasured. |
| Offered/universe films often flop | Singleton-cast path and budget treatment reproduced; frequency is unverified in actual player saves. |
| Every production succeeds | Not universal. A weak owned $210M fixture failed and earned only $109.36M studio receipts. |
| Box office stops at $300M | No universal $300M lifetime cap in current source. A specific screenshot/save/version is needed to explain that observation. |
| Box office stops at $3B | No fixed $3B lifetime cap; actual prepared run exceeded it. Dynamic ceilings and cap-seeking runs can still feel like a wall. |
| A high rating should guarantee a hit | Not the current design; craft, scale, launch, cast, demand and costs remain distinct. Rating-system design is outside this audit. |
