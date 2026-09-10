# Practical edition — From Opcode to Intent

This is the parallel, EPAM-branded edition. Its editable source is `index.html`; it is not generated from PowerPoint during normal editing or deployment.

- **Public URL:** https://zemskovmm.github.io/from-opcode-to-intent/practical/
- **Original edition:** https://zemskovmm.github.io/from-opcode-to-intent/
- **Authors:** Michael Zemskov and Dima Dorogoi.
- **Format:** 20 slides on a fixed 1600×900 canvas, with a proposed twenty-minute delivery budget. The extra author slide distinguishes this edition from the original 19-slide deck.

## Editorial scope

The original edition's files are unchanged. This version adds an author page, revises the title and agenda, combines the card/encoding and bottleneck/toolkit beats, and adds clarification, durable intent and an executable fixture-based acceptance exercise. The Brooks quotation and Red Queen ending remain intact.

The practical example is deliberately limited. Its full Git-viewer intent is a proposed contract. The interactive slide checks only classification of a recorded, synthetic Git-status fixture; it does not constitute a full Git client or prove repository safety and privacy. The regression toggle intentionally omits untracked files. It must never be described as a naturally occurring AI mistake.

The research findings live in the maintained Obsidian notes attached to trunk beats 11 and 13. The public `sources.html` provides the key sources and caveats without publishing the PowerPoint appendix or private execution artifacts.

## Source files

- `index.html`: the audience deck, including all slide text and editable diagrams.
- `styles.css`: the new edition's branding and layouts; it layers on the original shared `../styles.css` without changing it.
- `app.js`: navigation, native browser fullscreen and a separate remembered-position key, `opcode-to-intent:practical:last-slide`.
- `check-demo.mjs`: the executable acceptance exercise, kept independent of Reveal.
- `change-fixture.json`: captured Git output and separate expected classifications; this is the only fixture the exercise loads.
- `intent-example.md`: the illustrative full viewer contract, with its unimplemented scope stated explicitly.
- `assets/epam-logo.svg`: the six filled vector paths exported from the source PowerPoint's slide-master logo.
- `sources.html`: research, artwork, trademark, font/framework credits and exercise limitations.

The existing illustrations, reveal.js 6.0.1 and licensed font files are reused through relative URLs. There is no runtime CDN, analytics, account or backend. Do not add raw research snapshots, the source PowerPoint, corporate sample charts or confidential template material to the public site.

## Branding provenance

The supplied `There is no way back - images updated.pptx` contains the template guidance on slides 21–24:

- Primary palette: `#060606`, `#0078C2`, `#0047FF`, `#8453D2`, `#107E8D`, `#C9C9C9`, `#E4E4E4`.
- The prescribed cover gradient uses `#0078C2 → #0047FF → #8453D2`, with purple at the phrase's final fifth.
- The theme uses Calibri. The web deck requests locally available Calibri and falls back to the already bundled, licensed Source Sans Pro; it does not redistribute proprietary font files.
- The monochrome EPAM mark was exported from the PowerPoint's master logo. Its glyph geometry was retained, including the nonzero fill rule.

This is a light-slide application of that guide, not a claim of a formal corporate brand-compliance audit. EPAM branding does not imply endorsement of IDD or the cited studies.

## Proposed timing

| Slides | Section | Seconds |
|---|---|---:|
| 1–3 | Title, authors, agenda | 60 |
| 4–5 | Compression and abstraction | 90 |
| 6–10 | Historical ladder through SQL | 250 |
| 11–13 | Context, agents, hidden implementation | 170 |
| 14–15 | The Git-client request and moving bottleneck | 170 |
| 16–18 | Clarification, intent, acceptance exercise | 260 |
| 19–20 | Contract iceberg and Red Queen | 140 |
| Distributed | Pauses and handoffs | 60 |
| **Total** | **Proposed, not a measured rehearsal** | **1200** |

## Present and verify

From the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory docs
node --test tests/practical-demo.test.mjs
```

Open `http://127.0.0.1:4173/practical/`. Use Previous/Next, the arrow keys and Full screen. Explicit hashes such as `#/verify` take priority over remembered position. The original and practical editions must not overwrite one another's saved positions.

For the exercise: run the check, enable the deliberate-regression toggle, run again, disable it and run once more. The results should be pass → fail → pass, with the failure identifying the omitted untracked case. A stale result must be cleared when the toggle changes. Check that checkbox/button interaction does not navigate the presentation.

Before publishing, inspect every slide at desktop, tablet and phone sizes; verify image decoding, navigation boundaries, native fullscreen, blocked-storage behavior, local asset links, keyboard focus, and zero external runtime requests. Re-run the real browser journey against the deployed repository-prefix URL. Keep raw screenshots, browser profiles and execution reports in ignored `.AI/tmp/` rather than committing them.

GitHub Pages still publishes `main:/docs`. This edition is a new subdirectory, not a replacement for the original URL.
