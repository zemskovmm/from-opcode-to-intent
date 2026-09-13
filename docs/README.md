# From Opcode to Intent — web presentation

`index.html` is the single canonical 26-slide deck, with Michael Zemskov and Dima Dorogoi, Q&A and Thank you. It retains the history, intent contract and interactive acceptance exercise. The experiment summary and sixteen mobile app previews follow the consecutive hierarchy/counterpoint pair.

## Source files

- `index.html`: editable audience presentation; no build or PowerPoint export is needed.
- `app.js`: Previous/Next, native browser fullscreen and stable saved slide position.
- `styles.css`: common base, fixed canvas, image panels and control bar.
- `practical/styles.css`: branding, typography, exercise, closing pages and experiment layouts.
- `practical/index.html`: small relative redirect to `../`, preserving the explicit hash; no duplicate deck.
- `practical/check-demo.mjs`, `change-fixture.json`, `intent-example.md`: retained exercise assets in `practical/`.
- `assets/`: illustrations and editable hierarchy/counterpoint diagrams.
- `practical/assets/epam-logo.svg`: supplied-PowerPoint-derived logo.
- `instantcalc/`: full frozen comparison, methods, data and editable trees.
- `instantcalc/mobile/`: sixteen original mobile-layout previews, named `<model>-APP<1–4>-r01.webp`.
- `instantcalc/apps/`: sixteen frozen static demonstration copies, a directory with outcome badges and full-size screenshot links, and a publisher manifest.
- `practical/sources.html`, `intent-sources.html`, `credits.html`: research, scope and credits.
- `vendor/`: locally bundled reveal.js and licensed fonts.

Shared assets remain in their established directories. Historical source documents and artwork outside this website are preserved.

## Present

Open the website root. Use Previous/Next or arrow keys; Full screen enters or leaves native browser fullscreen. The fixed canvas is 1600×900. Click any mobile preview to try that exact app in a new tab. The [app directory](instantcalc/apps/) also links every original full-size screenshot.

Explicit slide hashes take priority over saved position. The canonical key is `opcode-to-intent:canonical:last-slide-id`. When absent or invalid, valid stable IDs from `opcode-to-intent:practical:last-slide-id` migrate first, followed by the frozen 22-position `opcode-to-intent:practical:last-slide` mapping. Former original-deck storage is never interpreted as a position in this deck. Blocked storage does not prevent navigation.

Useful deep links include `#/bottleneck`, `#/intent-hierarchy`, `#/intent-counterpoint`, `#/instantcalc-summary`, `#/instantcalc-mobile`, `#/verify`, `#/qa` and `#/thank-you`. Existing stable practical-route hashes survive the redirect.

## Local verification

From the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory docs
node --test tests/*.test.mjs
REQUIRE_MOBILE_IMAGES=1 node --test tests/deck-structure.test.mjs
```

Open `http://127.0.0.1:4173/`. The normal structural tests verify all sixteen exact screenshot URLs. Enable the image file gate only after all verified screenshots have been copied. File presence alone does not prove image provenance, decoding or visual fidelity.

For frozen-data comparison, set `INSTANTCALC_FROZEN` to the externally retained frozen report directory when running `tests/instantcalc-companion.test.mjs`. The public site does not include private execution paths or traces.

Inspect all slides at desktop, tablet and phone viewport sizes. Check text/footer clearance, gallery image decoding and app links, Previous/Next boundaries, keyboard controls, fullscreen, hash precedence, saved-position migration, blocked storage, local links and zero external runtime requests. Exercise pass → deliberate fail → restored pass, ensuring checkbox/button interaction does not navigate the deck. Check the redirect and local resources under the repository URL prefix as well as at `/`.

Navigation scripts, shared diagrams and the branding stylesheet use the first 12 characters of their SHA-256 digest as `?v=` cache keys. Update affected HTML references whenever those assets change.

## Public scope

GitHub Pages serves `main:/docs`; `.nojekyll` keeps the website static. No runtime CDN, backend, analytics, account, package installation or secret is needed. Only audience content, sources and credits belong here. Speaker notes, internal reports, source PowerPoint/PDF files and corporate appendices stay outside the public site. See [branding provenance](practical/README.md#branding-provenance). Branding does not imply endorsement of the cited research.

## Frozen app hosting

The gallery links to `instantcalc/apps/<run_id>/`: final feature source for fifteen runs and final baseline source for Terra APP4, whose feature request was unsent. These are demonstration copies, not newly qualified runs or new measurements. Known expression, persistence and migration failures remain. The original interface is preserved and no sample data is seeded.

The only hosting adaptations are explicit storage-key literal prefixes (`instantcalc-demo:<run_id>:` plus the original key) and entry-HTML root URLs changed to relative URLs. All 27 app-defined keys are isolated, including active-row and variables keys. The original collision groups are Terra APP3/APP4 expressions, Luna APP1/APP2/APP3 rows, and Luna APP1/APP3 active-row and variables. No global Storage/window monkeypatch is used. A demo retains its own state on reload; different demos do not share state or import the original unprefixed keys.

[`scripts/export-instantcalc-apps.py`](../scripts/export-instantcalc-apps.py) is a maintained, standard-library-only exporter for this frozen cohort. Supply an explicit experiment root containing `apps/<model>/<arm>/r01`:

```sh
python3 scripts/export-instantcalc-apps.py --source-root "$INSTANTCALC_SOURCE_ROOT"
python3 scripts/export-instantcalc-apps.py --source-root "$INSTANTCALC_SOURCE_ROOT" --check
REQUIRE_MOBILE_IMAGES=1 INSTANTCALC_FROZEN="$FROZEN_REPORT_DIRECTORY" INSTANTCALC_SOURCE_ROOT="$INSTANTCALC_SOURCE_ROOT" node --test tests/*.test.mjs
```

Run from the repository root. Export first verifies every repository HEAD against the selected `final_commit` in the frozen benchmark and screenshot manifest. It reads only pinned Git blobs, follows the entry HTML's local runtime dependency closure, and copies no worktree files, build tools, tests, packages, server code or internal evidence. It stops on unresolved storage or runtime URL forms and validates the entire cohort before writing. It never edits the source repositories or deletes unknown output files. `--check` without a source root verifies the public manifest, hashes, declared adaptations, dependency closure and isolated keys; with a source root it additionally regenerates in memory and compares exact bytes against pinned sources.

The [publisher manifest](instantcalc/apps/manifest.json) records all sixteen source commits, selected phases, original outcomes, each runtime file's source and served SHA-256, exact literal replacements with source positions, every storage operation and key location, and original collision groups. The public whitelist admits only those individually hashed runtime files; it does not admit raw benchmark traces or credentials. Relative runtime links work at `/` and `/from-opcode-to-intent/`, with no backend, analytics or CDN.

Publication review must exercise all sixteen served apps, reload persistence and cross-app isolation in the browser. Structural and provenance checks do not requalify the benchmark runs or establish browser behavior.
