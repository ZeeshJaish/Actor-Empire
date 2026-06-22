# Owned Right Game UI Polish Design

## Goal

Make the Rights Library and Development Brief feel less like rectangular admin panels
and more like a studio strategy game without changing the ownership or production flow.

## Rights Library

- Replace the unexplained green archive icon with a labelled `Owned` seal.
- Use the property's accent as a subtle dossier glow and ownership edge.
- Replace the three-cell table with compact readable facts: acquisition price, control,
  and `Projects Made` or `Projects Remaining`.
- Reduce hard borders and use layered depth, spacing, stamps, and a lighter action rail.
- Preserve the existing `Develop Property` action and Rights Vault location.

## Development Brief

- Present the screen as a studio greenlight briefing rather than a form.
- Replace the boxed stat table with compact dossier chips and remove the unclear
  `Existing Flow` status.
- Movie selection uses electric blue; Series uses cinematic crimson. Icon, text, and
  selected labels remain present so color is never the only signal.
- Creative-play choices use slimmer briefing rows instead of large square panels.
- Sequel and Spin-off remain visible as compact locked future plays.
- Keep the existing sticky `Begin Development` action.

## Authorization Feedback

Authorization does not disappear automatically. A result panel explains that the new
concept entered the existing Active Scripts pipeline and offers:

- `Assign Writer` — opens the existing script-development choice for the created script.
- `Go to Active Scripts` — returns to the existing Scripts lane.
- `Stay in Rights Library` — closes the result without leaving the current ownership view.

No new writer, script, concept, or greenlight system is created.

## Accessibility And Motion

- Selected cards use color plus icon, text, and `aria-pressed`.
- Dynamic result feedback uses an accessible dialog state.
- Touch targets remain at least 44 pixels high.
- Reduced-motion mode keeps the state change without large scaling or rotation.

## Verification

- TypeScript and production build pass.
- Existing rights audits remain green.
- Browser QA covers both format colors, creative-play selection, locked future actions,
  ownership seal clarity, persistent result choices, and mobile scrolling.
