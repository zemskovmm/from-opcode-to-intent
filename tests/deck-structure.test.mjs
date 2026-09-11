import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';

const original = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
const practical = readFileSync(new URL('../docs/practical/index.html', import.meta.url), 'utf8');
const sections = html => [...html.matchAll(/<section\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
const text = html => html.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

for (const [name, html, front, ending] of [
  ['original', original, ['slide-01', 'authors', 'slide-02'], 'slide-19'],
  ['practical', practical, ['title', 'authors', 'agenda'], 'red-queen'],
]) {
  test(`${name}: branded front matter and Q&A/Thank you follow the narrative`, () => {
    const slides = sections(html);
    const ids = slides.map(s => s[1]);
    assert.equal(slides.length, 24);
    assert.equal(new Set(ids).size, 24);
    assert.deepEqual(ids.slice(0, 3), front);
    assert.deepEqual(ids.slice(-3), [ending, 'qa', 'thank-you']);
    assert.match(text(slides[1][2]), /Michael Zemskov/);
    assert.match(text(slides[1][2]), /Dima Dorogoi/);
    assert.match(text(slides.at(-2)[2]), /Q&A/);
    assert.match(text(slides.at(-1)[2]), /Thank you\./);
    assert.match(text(slides.at(-1)[2]), /Michael Zemskov.*Dima Dorogoi/);
    const bottleneck = ids.indexOf(name === 'original' ? 'slide-15' : 'bottleneck');
    assert.deepEqual(ids.slice(bottleneck + 1, bottleneck + 3), ['intent-hierarchy', 'intent-counterpoint']);
    for (const slide of slides) {
      if (['intent-hierarchy', 'intent-counterpoint'].includes(slide[1])) {
        assert.match(slide[2], /class="slide-frame concept-frame"/);
        assert.match(slide[2], /intent-sources\.html#(?:hierarchy|counterpoint)/);
      } else assert.match(slide[2], /class="brand-footer"/);
    }
    assert.match(html, /01 \/ 24/);
    const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(s => s[1]);
    assert.equal(scripts.length, new Set(scripts).size, "Runtime scripts must load only once");
  });
}

test('original retains every existing narrative deep-link in order', () => {
  const ids = sections(original).map(s => s[1]);
  assert.deepEqual(ids.slice(3, -2).filter(id => !['intent-hierarchy', 'intent-counterpoint'].includes(id)), Array.from({length:17}, (_, i) => `slide-${String(i + 3).padStart(2, '0')}`));
  assert.match(original, /The Last Abstraction\?/);
  assert.doesNotMatch(original, /id="acceptance-demo"/);
  assert.match(practical, /id="acceptance-demo"/);
});

test('changed runtime assets carry current cache keys', () => {
  for (const [html, href, asset] of [
    [original, 'app.js', 'app.js'],
    [original, 'practical/styles.css', 'practical/styles.css'],
    [practical, 'styles.css', 'practical/styles.css'],
    [practical, 'app.js', 'practical/app.js'],
    ...['intent-hierarchy', 'intent-counterpoint'].flatMap(id => [
      [original, `assets/${id}.svg`, `assets/${id}.svg`],
      [practical, `../assets/${id}.svg`, `assets/${id}.svg`],
    ]),
  ]) {
    const bytes = readFileSync(new URL(`../docs/${asset}`, import.meta.url));
    const digest = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
    assert.ok(html.includes(`"${href}?v=${digest}"`), `${href} must invalidate stale browser caches`);
  }
});
