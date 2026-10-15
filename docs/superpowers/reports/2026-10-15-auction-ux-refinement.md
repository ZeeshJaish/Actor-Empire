# Auction UX refinement

This supersedes the customization and Market placement described in the earlier auction terms report.

- Backend starts at0/off, with optional increase controls. New title/package/upcoming lots and restored LIVE rooms allow0. Signed zero-backend licences preserve0 through save/reload.
- New future funding offers are binding when selected; Deal Type selection is removed. Future funding remains off initially.
- Platform rights percentage meant the platform's streaming revenue share, not copyright ownership. Removed the misleading extra percentage input; new funded titles retain the previous default100% platform revenue share. Historical signed terms and legacy option support are preserved.
- Compact form has project/continuation, quantity, per-title budget and format, plus a concise total/deadline line. Backend uses one inline row instead of a large dial tile.
- Private scouting uses one button: Scout price -> Confirm -> Scouting -> next Scout price. First click doesn't spend; confirmation performs one guarded action. No second confirmation panel. New quote/count invalidates old confirmation.
- Saved Funding Deals removed from Market. Stored agreements/production processing are retained. A dashboard location has intentionally not been chosen or implemented yet.

Verification: build, TypeScript, CM3, CM4, auction funding and auction terms audits passed. Domain regression observed red before implementation and green after; includes actual zero-backend settlement and save/reload. Browser reproduced old extra confirmation buttons before changes, then verified one button, first-click cash unchanged, exactly$450K charged on confirmation,20 new offers, next quote$900K. Compact form checked at320/390px with no horizontal overflow and no Deal Type/Platform Rights inputs. Screenshots in output/playwright/auction-compact-funding-320.png, auction-compact-funding-390.png and market-inline-scout-320.png. Tests use isolated QA fixture storage only.
