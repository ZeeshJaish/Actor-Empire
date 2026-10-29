# Creator economy trace — 29 October 2026

Analysis only. Production code and personal saves were not changed or accessed. Existing unrelated work stays in place. The adjacent JSON records controlled observations and source hashes of the current working copy; this is not a statement about which code is in the shipped app.

## Verdict

Confirmed interconnected growth, economics, and view-accounting problems. The reported 10,000M subscribers means 10 billion. Abbreviating it as B would improve readability but would not fix the underlying growth or payouts.

### 1. YouTube subscriber/library positive feedback

`processYoutubeChannel` gives each retained video views proportional to 15% of the current subscriber counter, times quality and age factors. Age decay has a permanent 1% floor. Every video repeats this independently, with no finite active audience, overlap deduction, or separation of existing subscribers from new viewers. Every qualifying view tranche generates more subscribers. There is no subscriber churn or remaining-audience saturation in this path.

Three seeds per case, 1,000 starting subscribers and fixed quality 90:

| Uploads/week | First crossing of 10B subscribers |
| --- | --- |
| 1 | weeks 414–416 |
| 5 | weeks 127–129 |
| 20 | weeks 44–45 |

These execute the actual YouTube helper across calendar weeks. They are subsystem projections, not naturally earned full careers: upload energy, costs, skill preparation and offer availability were not enforced. Diagnostic weekly-history arrays were omitted between iterations to bound audit RAM; growth inputs and all video ages/counts were retained. The 20-upload case is specifically a high-activity stress case.

A 10-year-old quality-90 video on a 100M-subscriber channel still generated 615,000 views, 7,687 subscribers and $1,230 ad income in a fixed-roll week. Ad RPM itself is $2/1,000 views; simulated view supply is what compounds.

### 2. YouTube brand offers, merch, live and memberships use raw size

At 10B subscribers, monetized and trust/mood 80, with no uploaded videos, the fixed-roll YouTube brand offer quoted $2.9B and 2.1B seeded views. This is an offer quote, not a settled brand payment. Five seeded quotes ranged $2.256B–$3.975B. Completing integrations also fabricates its initial audience from that subscriber-sized offer, instead of proving engaged reach.

Luxury merch charged a fixed $100,000 production cost and generated $9.497094444B actual cash profit in the fixed-roll isolated case. Another drop six weeks later returned $9.765416666B. Purchase units, per-unit production/fulfillment, available buyer budgets, and overlapping repeat buyers do not constrain this formula. Five quote seeds gave $6.54B–$11.54B net profit at 10B subscribers.

The same raw-size exposure applies to livestream viewers/donations and membership targets. Those paths were source-traced; a full donated/membership career was not simulated.

### 3. Cooldown and save replay findings

The tested same-week merch duplicate was rejected with COOLDOWN, including after an actual verified in-memory save/reload. The first drop recorded one gross-sales and one production-cost entry with the correct cash difference. Existing merch and serialized YouTube-event regression audits pass. These checks cover accounting and guards, not economically sustainable scale.

The inflated counter and cash payout survive verified save/reload. This is a model/economics loophole, not a demonstrated double-click payout exploit. Directly invoking the pure weekly helper twice accrues results twice, but that alone is not proof that a player can bypass the app's weekly/persistence guards.

### 4. Ordinary uploads/trailers have disconnected initial reach

The actual private upload factory and its checked-in plan/identity tables were evaluated. With fixed rolls and no asset boost, SAFE trailers start at 0 views and PROJECT_PROMO trailers at 695 views, both at 1,000 and at 10B subscribers. Initial reach is driven by fixed plan/asset bonuses, not the channel's audience. This is an immediate-upload counter observation: the next-week helper does grow views.

In addition, video weekly growth does not distinguish ordinary uploads from a relevant movie trailer; the core view formula reads age, quality and subscriber count. A project-promotion attribution link does exist, so the diagnosis is not that trailers have no project integration anywhere.

### 5. Channel totals erase event/live views

Confirmed with the actual Next Week engine: a creator event added 305,000 channel views and 2,541 subscribers to a 1M-subscriber, zero-upload isolated player. Next Week reduced channel views to 0 while preserving all 1,002,541 subscribers. The weekly helper replaces lifetime channel views with only the sum of retained video views; event/livestream counters are added elsewhere and can disappear.

### 6. Instagram and X are not identical

Actual Instagram post-outcome helper, fixed fame/reputation 80, 1,000 followers, three seeds: five REEL posts/week crossed 10B followers at weeks 754–756. One REEL/week reached about 1.59M–1.74M followers at 1,040 weeks. These omit weekly organic fame growth and energy constraints, and are not full-career projections. The per-post gain limit is proportional to existing followers; it does not impose remaining reachable-audience saturation.

Actual X posting math with fixed fame 80 and five GENERAL posts/week reached only 49,733–51,865 followers from 1,000 over 1,040 weeks. Its raw follower-growth formulas lack a finite audience model too, but these runs do not reproduce YouTube's fast 10B snowball. No X direct-income exploit is claimed.

### 7. Existing sponsorship work must be preserved

Current manager sponsorship and Instagram DM future quotes already use `quoteSponsorshipValue`: observed engagement, modeled eligible audience, ad-price references, buyer budgets and same-brand active obligations. YouTube brand deals bypass that valuation path. This protection is in the current working copy, and should not be described as already shipped without release verification.

### 8. Additional correctness/performance risks

Quality 0 is read through `qualityScore || 50` and treated as quality 50. Fixed-roll initial weekly views at 1M subs: quality 0 = 375,000; quality 1 = 81,000. This is an independently reproduced fallback error. The comment says the quality multiplier tops out at 2.5, while the formula reaches 4.5 at quality 100; that mismatch alone does not establish the intended balance.

Video weekly histories grow without a bound in this path and are copied every week. This is a source-confirmed scaling concern, not a measured device-performance regression in this audit.

## Recommended implementation order

1. Correct channel-view accounting and zero-quality fallback first, with idempotent event/live contributions and honest partial legacy history. Do not subtract previously earned subscribers, views or cash.
2. Introduce a small shared active-audience/read model. Separate unique potential new viewers, returning/subscribed viewers, repeat views, content relevance and inactive followers. Evergreen videos may keep earning; independently multiplying the same subscriber pool for every old upload must stop.
3. Price future YouTube integration offers using qualified recent reach and campaign budgets, consistent with the existing sponsorship model. Preserve accepted saved deal terms and payment obligations.
4. Quote future merch from reachable buyers, conversion, unit price and production/fulfillment costs; keep cooldowns and exact-once settlement, and model repeat-drop fatigue. Make livestream/membership economics use the same engaged-audience basis.
5. Align ordinary uploads and project trailers with relevant audience/quality/interest. Views may legitimately exceed unique population through repeats; subscriber identity should not be treated as infinitely convertible new demand. Keep bounded recent metrics plus cumulative counters, rather than a second giant history database.
6. Decide tuning using multiple seeds and fresh/established/legacy-inflated, free/boosted cases. Verify actual UI actions, accepted offers, costs, next weeks and verified reload; preserve unrelated changes and historical money/contracts. Do not implement an arbitrary balance wipe, guaranteed hits/flops, or a display-only number cap.

Evidence: the adjacent JSON contains exact observations. Temporary executable probes and logs are under `/tmp/ae-social-*`; no production code was patched for this analysis.
