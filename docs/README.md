# From Opcode to Intent — web presentation

This folder is the editable static website. PowerPoint is no longer required to change or present the talk.

- `index.html`: the 19 audience slides; edit the text and HTML here.
- `styles.css`: typography, a borderless full-height image panel on the right 40% of each illustrated slide, per-slide crop focal points, the diagram and control-bar styling. Text occupies the left side; image credits remain below it. Slide 18 keeps its full-width editable diagram.
- `app.js`: Previous/Next, actual browser fullscreen, and remembered slide position.
- `assets/`: optimized versions of the selected images; original artwork is preserved separately.
- `vendor/`: locally bundled reveal.js 6.0.1 and font files, with their licenses.
- `credits.html`: artwork and quotation credits.

## Present

Use Previous / Next or the arrow keys. Use Full screen to enter or leave native browser fullscreen. Direct links to individual slides take priority over remembered position. The browser remembers only the slide number; no account, analytics or backend is used.

GitHub Pages serves the `main` branch's `/docs` folder. `.nojekyll` keeps the files static: no framework build, server process, CDN, package installation or secret is needed on the host. GitHub's own Pages deployment still runs when this folder is published.

For a local preview from this repository's root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory docs
```

Then open `http://127.0.0.1:4173/`. This local preview server is optional and is not part of the hosted site.

## Publishing scope

Only the 19 audience slides are included. Speaker notes, internal comments, the corporate template appendix, source PowerPoint/PDF files and the confidential footer are not part of this site. Original files are unchanged. Image credits are retained.

## Verification

Browser checks cover all 19 slides, all 18 images, both navigation directions and boundary buttons, keyboard navigation, real fullscreen entry/exit, remembered position and explicit slide links, desktop/tablet/mobile layouts, and absence of external runtime requests. The slide-18 iceberg is editable HTML/SVG, not a screenshot.

See the root repository for the wider talk materials; this folder is the source of truth for the web version.
