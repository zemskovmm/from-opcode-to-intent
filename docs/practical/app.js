'use strict';
const previous = document.getElementById('previous');
const next = document.getElementById('next');
const count = document.getElementById('slide-count');
const fullscreen = document.getElementById('fullscreen');
const status = document.getElementById('status');
// Frozen index mapping for the previous practical edition.
const legacySlideIds = [
  "title",
  "authors",
  "agenda",
  "compression",
  "abstraction",
  "eniac",
  "cards",
  "assembly",
  "languages",
  "sql",
  "context",
  "agents",
  "hidden",
  "git-client",
  "bottleneck",
  "clarify",
  "intent",
  "verify",
  "iceberg",
  "red-queen",
  "qa",
  "thank-you"
];
const positionKey = 'opcode-to-intent:practical:last-slide-id';
const explicitSlide = Boolean(location.hash);
let rememberedSlide = '';
try {
  rememberedSlide = localStorage.getItem(positionKey) || '';
  if (!rememberedSlide) {
    const legacy = localStorage.getItem('opcode-to-intent:practical:last-slide');
    if (/^(0|[1-9]\d*)$/.test(legacy)) rememberedSlide = legacySlideIds[Number(legacy)] || '';
  }
} catch {}
fullscreen.disabled = !document.fullscreenEnabled;
fullscreen.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
    status.textContent = '';
  } catch {
    status.textContent = 'Full screen was blocked by your browser. You can use its View menu instead.';
  }
});
document.addEventListener('fullscreenchange', () => {
  const active = Boolean(document.fullscreenElement);
  fullscreen.textContent = active ? 'Exit full screen' : 'Full screen';
  fullscreen.setAttribute('aria-label', active ? 'Exit full screen' : 'Enter full screen');
});
function updateControls() {
  const index = Reveal.getIndices().h;
  previous.disabled = index === 0;
  next.disabled = index === Reveal.getTotalSlides() - 1;
  count.textContent = `${String(index + 1).padStart(2, '0')} / ${Reveal.getTotalSlides()}`;
  try { localStorage.setItem(positionKey, Reveal.getCurrentSlide().id); } catch {}
}
previous.addEventListener('click', () => Reveal.prev());
next.addEventListener('click', () => Reveal.next());
Reveal.on('slidechanged', updateControls);
Reveal.initialize({
  width: 1600, height: 900, margin: 0, controls: false, progress: false,
  center: false, hash: true, hashOneBasedIndex: true, view: 'slide',
  scrollActivationWidth: null,
  transition: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'fade',
  transitionSpeed: 'fast', pdfMaxPagesPerSlide: 1, pdfSeparateFragments: false,
}).then(() => {
  const rememberedIndex = Reveal.getSlides().findIndex(slide => slide.id === rememberedSlide);
  if (!explicitSlide && rememberedIndex >= 0) {
    Reveal.slide(rememberedIndex);
  }
  updateControls();
});
