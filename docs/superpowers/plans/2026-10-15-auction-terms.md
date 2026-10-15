# Approved auction terms implementation

The user approved the existing clean auction UI with distinct own-platform identity, meaningful late-bid extension, no auction marketing guarantee, and explicit production/future funding.

1. Test late bids, duplicate bids, funding validation, exposure, settlement and persistence.
2. Replace new auction marketing terms with eligible current production funding and structured future terms: original/sequel/next season, quantity, budget per title, format, rights share, firm/option, NPC deadline52.
3. Reserve firm funds, make options explicitly exercisable, create and progress real funded NPC productions. Preserve legacy signed deals.
4. New player-production locked funding deadlines26; legacy missing deadlines104.
5. Preserve visual style; own brand and YOUR PLATFORM label, rival colors, +seconds feedback, clear customization/reserve breakdown.
6. Run focused and existing market/save checks, TypeScript/build, isolated browser verification.

Timer policy: new rooms start15 seconds; meaningful bids retain early auction pacing. In final5 seconds, add3 seconds and extend the45-second room limit, bounded by75 seconds. Unchanged offers do not mutate state; lower/equal-value revisions do not extend the clock. At the absolute limit no extension is promised.

Implementation stays in the user-selected main working directory. No commit/push is part of this feature request.
