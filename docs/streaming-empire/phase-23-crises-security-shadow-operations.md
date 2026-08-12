# Phase 23 — Crises, Security and Shadow Operations

Status: implemented in owned-streaming schema v21.

## Locked player promise

Phase 23 turns operational failure into a recoverable company story, not an
instant game-over or a random penalty card. Every crisis follows a persistent
chain:

1. detection;
2. immediate operating pressure;
3. leadership doctrine;
4. viewer compensation and public communication;
5. funded multi-week recovery;
6. a permanent trust, evidence and oversight consequence.

Clean play can win every company objective. Shadow Operations are optional,
abstract corporate-risk choices and never a required power path.

## Incident Command

Technology Campus now contains a scene-first Incident Command launcher and a
live HQ alert when a crisis is active. The dedicated experience has five rooms:

- **Command:** verified cause, affected audience, revenue at risk, six-stage
  incident timeline, response doctrine, compensation, communications, cost and
  recovery target.
- **Defence:** security and reliability posture plus four clean initiatives:
  readiness drill, protected speak-up channel, transparency report and
  independent audit.
- **Shadow:** six fictional abstract operations showing company cost, estimated
  success, exposure risk, expected impact and delayed evidence. It contains no
  real targets, tools, commands, payloads or operational attack instructions.
- **Evidence:** a persistent timeline combining crises, clean operations and
  unresolved or exposed shadow decisions.
- **Oversight:** funded responses to formal regulatory inquiries and protected
  whistleblower reports.

The UI includes a network-operations scene, non-colour-only track labels,
mobile layouts, focus-managed dialogs and reduced-motion treatment.

## Crisis engine

The deterministic weekly engine considers canonical operating facts:

- peak capacity use and playback success;
- infrastructure technical debt;
- Security and Reliability technology levels;
- active acquisition integrations;
- rights compliance;
- public trust, employee loyalty and accumulated security pressure.

It can produce outages, account breaches, content leaks, recommendation
backlash, rights conflicts or employee allegations. Only one unresolved crisis
can exist at a time, and crisis detection has a cooldown so the system creates
stories rather than notification spam.

An unresolved or recovering crisis affects acquisition, churn, engagement,
playback health, recovery cost and causal-driver explanations in the same
canonical weekly CEO loop. A completed plan records `CRISIS_RECOVERED` and
returns the platform to normal operation.

## Persistent company tracks

Schema v21 adds:

- Public Trust;
- Regulatory Scrutiny;
- Employee Loyalty;
- Evidence Trail;
- Security Pressure.

Phase 20 Rivalry Heat and Global Prestige remain connected. Board Confidence
continues through Phase 19 governance. All tracks are normalized to safe values
for older saves and compacted with bounded history.

## Clean defence

Clean initiatives create economic and strategic value rather than acting as a
weaker moral choice. They can reduce incident probability, regulatory
scrutiny, evidence and security pressure while raising trust, loyalty and board
confidence. Public trust also helps acquisition and the listed-company quote.
An eight-week benefit window prevents farming the same initiative.

## Shadow Operations and delayed evidence

The six abstract operation classes are intelligence purchase, whisper
campaign, contract pressure, covert content leak, corporate espionage and
covert service-disruption attempt. They interact only with fictional persistent
rivals from Platform Wars.

The company pays once. Success and evidence timing use the owned platform's
deterministic seed. Competitive impact can affect rival cash reserve, prestige,
mistakes, memory and rivalry heat. Attribution resolves three to seven game
weeks later. Exposure damages trust, loyalty and prestige while increasing
evidence and regulatory scrutiny. Only one evidence window may remain open.

No system exposes operational hacking mechanics.

## Oversight and recovery

High scrutiny can open a regulator case; low loyalty or a high evidence trail
can create a protected internal disclosure. Regulators can be answered through
cooperation, remediation or contest. Whistleblowers can be protected and
investigated, disclosed, or discredited. Even ethically risky routes close the
immediate case, but worsen persistent consequences.

Every branch has a funded recovery route. No crisis, exposure, inquiry or
whistleblower event immediately ends the company.

## Public company connection

Phase 22 quotes now react to active incident severity, public trust, evidence
and regulatory pressure in addition to subscribers, cash, playback, debt and
earnings. Private companies keep the same crisis gameplay without stock-market
volatility.

## Persistence

Schema v21 adds the `crisisSecurity` aggregate and bounded arrays for crises,
shadow operations, trust initiatives, regulatory cases and whistleblower
reports. It adds fact-backed crisis, exposure, regulator and whistleblower
cinematic types and canonical ledger event types. Cinematics remain skippable
and cannot exist without a retained ledger fact.

## Deferred

- Phase 24 legacy, succession, endgame and endless-company systems.
- Phase 25 monetization. Phase 23 has no paid rescue, attack power, security
  advantage or crisis bypass.

## Verification

Run:

```bash
npm run audit:streaming-crises-security-phase23
npm run audit:streaming-weekly-loop-phase10
npm run audit:streaming-public-markets-phase22
npm run lint
npm run build
```
