# From Opcode to Intent — web presentation

This folder is the editable static website. PowerPoint is not required to change or present either edition.

- `index.html`: the 24-slide original edition, with EPAM title/authors/agenda pages, the original historical narrative, Q&A and Thank you.
- `styles.css`: the common base, fixed canvas, right-hand 40% image panels, editable diagram and control bar. The viewer surround stays black; slides stay white.
- `practical/styles.css`: shared EPAM branding, typography, footer and closing-page layouts, plus practical-specific styles. Both editions reference this same file to keep the visual treatment consistent.
- `app.js`: Previous/Next, actual browser fullscreen and remembered position for the original edition.
- `assets/`: optimized illustrations and the shared, editable `intent-hierarchy.svg` / `intent-counterpoint.svg` diagrams; original artwork remains separate.
- `practical/assets/epam-logo.svg`: shared logo exported from the supplied PowerPoint's master artwork.
- `vendor/`: locally bundled reveal.js 6.0.1 and font files, with licenses.
- `credits.html`: artwork, quotation and branding credits.
- `intent-sources.html`: separate citation mappings and limitations for the hierarchy and counterpoint slides.
- `practical/`: the separate 24-slide practical edition, including the fixture-backed acceptance exercise.

## Present

Use Previous / Next or the arrow keys. Full screen enters or leaves native browser fullscreen. Explicit slide links take priority over remembered position. The original edition stores a slide ID locally and migrates valid saved positions from its former 19-slide layout, so inserting the author page does not move an existing reader to the wrong subject. The practical edition likewise stores stable slide IDs under a separate key and migrates its former 22-slide index mapping. No account, analytics or backend is used.

The original deep links `#/slide-01` through `#/slide-19` are retained. The new paired slides are `#/intent-hierarchy` and `#/intent-counterpoint`, immediately after the bottleneck discussion. Their SVGs stay shared across editions, and their Sources & scope links lead to separate numbered reference lists. The author page is `#/authors`; the closing pages are `#/qa` and `#/thank-you`. The Red Queen remains the narrative conclusion before discussion and thanks. Both decks link to one another from the control bar.

GitHub Pages serves `main:/docs`. `.nojekyll` keeps the files static: no application build, runtime server, CDN, package installation or secret is needed on the host. GitHub's Pages deployment still runs when the site is published.

For a local preview and the native Node checks, from the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory docs
node --test tests/*.test.mjs
```

Open `http://127.0.0.1:4173/` or `http://127.0.0.1:4173/practical/`.

Changed navigation scripts, shared SVG diagrams and shared-branding stylesheet URLs carry a `?v=` query containing the first 12 characters of the asset’s SHA-256 digest. Update the affected HTML references when an asset changes; the native tests reject stale cache keys. This prevents a returning browser from mixing the new slide order with cached navigation code or old closing-page styles.

## Publishing scope

Only audience content and its sources/credits are published. Speaker notes, internal comments, corporate template appendices, source PowerPoint/PDF files and confidential footers are excluded. The original source documents and artwork remain unchanged. EPAM branding comes from the supplied PowerPoint guide; see [branding provenance](practical/README.md#branding-provenance) for the palette, logo export and font fallback. Branding does not imply endorsement of the cited research.

## Verification

Check every slide in both editions at desktop, tablet and phone sizes. Verify decoded images, right-hand 40% panels, text/footer clearance, navigation boundaries, keyboard controls, native fullscreen, saved-position migration and independence, hash precedence, blocked-storage behavior, local links and zero external runtime requests. Exercise practical pass → deliberate fail → restored pass. Repeat the browser journey against the deployed repository-prefix URLs.

The original iceberg remains editable HTML/SVG at `#/slide-18`, rather than a screenshot. The practical contract iceberg is intentionally a different version.

See the root repository for the wider talk materials; HTML remains the source of truth for the web presentations.
