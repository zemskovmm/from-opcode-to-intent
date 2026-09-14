# From Opcode to Intent — supporting assets

The audience deck is now [`../index.html`](../index.html). This directory retains its shared styling, logo, research sources and fixture-based acceptance exercise. `index.html` only redirects to `../`, preserving the slide hash.

The single presentation has 32 slides and credits Michael Zemskov and Dima Dorogoi. It includes the six-slide intent story and counterpoint, the InstantCalc summary and mobile gallery, the intent contract and the acceptance exercise, then the contract iceberg and Red Queen conclusion before Q&A and Thank you. The hierarchy and counterpoint are qualitative design lenses, not a universal ranking.

## Exercise scope

The full Git-viewer intent is a proposed contract. The interactive slide checks only classification of a recorded, synthetic Git-status fixture; it does not constitute a full Git client or prove repository safety and privacy. The regression toggle intentionally omits untracked files and must not be described as a naturally occurring AI mistake.

- `check-demo.mjs`: exercise logic, independent of Reveal; its fixture URL resolves relative to the module.
- `change-fixture.json`: recorded Git output and independent expected classifications.
- `intent-example.md`: illustrative viewer contract with its unimplemented scope stated explicitly.
- `styles.css`: shared presentation styles, including the summary and mobile gallery.
- `assets/epam-logo.svg`: six filled vector paths exported from the supplied PowerPoint's slide master.
- `sources.html`: research, artwork, trademark, font/framework credits and exercise limitations; backlinks target the canonical deck.

The runtime is now `../app.js`. See the [website documentation](../README.md) for saved-position migration, canonical deep links and local preview instructions.

## Branding provenance

The supplied `There is no way back - images updated.pptx` contains the template guidance on slides 21–24:

- Primary palette: `#060606`, `#0078C2`, `#0047FF`, `#8453D2`, `#107E8D`, `#C9C9C9`, `#E4E4E4`.
- The prescribed cover gradient uses `#0078C2 → #0047FF → #8453D2`, with purple at the phrase's final fifth.
- The theme uses Calibri. The web deck requests locally available Calibri and falls back to the already bundled, licensed Source Sans Pro; it does not redistribute proprietary font files.
- The monochrome EPAM mark was exported from the PowerPoint's master logo. Its glyph geometry was retained, including the nonzero fill rule.

This is a light-slide application of that guide, not a claim of a formal corporate brand-compliance audit. EPAM branding does not imply endorsement of IDD or the cited studies.

## Present and verify

Open the website root. The exercise is at `#/verify`. Run the check, enable the deliberate regression, run again, then disable it and run once more. Results should be pass → fail → pass, identifying the omitted untracked row on failure. Changing the toggle must clear stale results.

Manual rehearsal should cover the 1600×900 canvas, smaller viewports, image decoding, text and footer clearance, keyboard focus, navigation, fullscreen and the redirect under a repository prefix. Proposed talk timing needs rehearsal after the experiment slides; discussion time is additional.
