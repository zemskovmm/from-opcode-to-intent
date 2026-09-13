import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const read = path => readFileSync(new URL(`../docs/${path}`, import.meta.url), 'utf8');
const canonical = read('index.html');
const redirect = read('practical/index.html');
const sections = html => [...html.matchAll(/<section\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)];
const text = html => html.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const order = ['title', 'authors', 'agenda', 'compression', 'abstraction', 'eniac', 'cards', 'assembly', 'languages', 'sql', 'context', 'agents', 'hidden', 'git-client', 'bottleneck', 'intent-hierarchy', 'intent-counterpoint', 'instantcalc-summary', 'instantcalc-mobile', 'clarify', 'intent', 'verify', 'iceberg', 'red-queen', 'qa', 'thank-you'];
const slides = sections(canonical);
const slide = id => slides.find(s => s[1] === id)?.[2] ?? '';
const models = ['astra', 'sol', 'terra', 'luna'];
const imagePaths = models.flatMap(model => [1, 2, 3, 4].map(app => `instantcalc/mobile/${model}-APP${app}-r01.webp`));

test('one canonical deck has 26 unique ordered slides, original practical IDs, authors and endings', () => {
  assert.deepEqual(slides.map(s => s[1]), order);
  assert.equal(new Set(slides.map(s => s[1])).size, 26);
  assert.match(canonical, /<title>From Opcode to Intent<\/title>/);
  assert.match(text(slide('authors')), /Michael Zemskov.*Dima Dorogoi/);
  assert.match(text(slide('qa')), /Q&A/);
  assert.match(text(slide('thank-you')), /Thank you\..*Michael Zemskov.*Dima Dorogoi/);
  slides.forEach((s, i) => {
    assert.match(s[0], new RegExp(`aria-label="Slide ${i + 1}:`));
    if (['intent-hierarchy', 'intent-counterpoint'].includes(s[1])) {
      assert.match(s[2], /class="slide-frame concept-frame"/);
      assert.match(s[2], /intent-sources\.html#(?:hierarchy|counterpoint)/);
    } else assert.match(s[2], /class="brand-footer"/);
  });
  assert.match(canonical, /01 \/ 26/);
  const scripts = [...canonical.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(s => s[1]);
  assert.equal(scripts.length, new Set(scripts).size);
  assert.equal(scripts.length, 3);
  assert.match(canonical, /src="practical\/check-demo.mjs"/);
  assert.ok(!existsSync(new URL('../docs/practical/app.js', import.meta.url)), 'Retired duplicate runtime must be removed');
});

test('summary gives minimal results, workflow setup, uncertainty and the full comparison link', () => {
  const summary = text(slide('instantcalc-summary'));
  for (const pattern of [/4 models × 4 workflows/, /same calculator request/i, /0, 1 or 5 refinements/, /5 refinements \+ genuine IDD/, /separate variables table \+ total at bottom/i, /16 baselines/, /15 feature builds/, /7 qualified/, /3 app.failed/, /6 blocked/, /checking.*persistence.*migration/i, /one run per cell/i, /control.*coverage/i, /does not establish a causal IDD benefit or a model ranking/i, /\$18\.28016324/, /actual charges.*Astra prices.*unknown/i]) assert.match(summary, pattern);
  assert.match(slide('instantcalc-summary'), /href="instantcalc\/"/);
  assert.match(slide('bottleneck'), /class="evidence-note"[^]*?href="instantcalc\/"/);
  assert.doesNotMatch(slide('verify'), /instantcalc/);
  const evidence = sections(read('practical/sources.html')).find(s => s[1] === 'evidence')[2];
  assert.match(evidence, /href="\.\.\/instantcalc\/"/);
  assert.match(evidence, /href="\.\.\/instantcalc\/#methods"/);
});

test('mobile gallery has all sixteen exact image contracts, model groups and honest phase captions', () => {
  const gallery = slide('instantcalc-mobile');
  const images = [...gallery.matchAll(/<img\b[^>]*src="(instantcalc\/mobile\/[^"]+)"[^>]*>/g)];
  assert.deepEqual(images.map(m => m[1]), imagePaths);
  assert.equal((gallery.match(/class="mobile-model"/g) || []).length, 4);
  for (const [i, img] of images.entries()) {
    const model = models[Math.floor(i / 4)], app = i % 4 + 1;
    assert.match(img[0], /width="390" height="844"/);
    assert.match(img[0], new RegExp(`alt="${model[0].toUpperCase() + model.slice(1)} APP${app}[^"<>]*(?:refinements|refinement)[^"<>]*"`));
    if (app === 4) assert.match(img[0], /genuine IDD/);
    assert.ok(gallery.includes(`<a href="instantcalc/apps/${model}-APP${app}-r01/" target="_blank" rel="noopener">`));
  }
  assert.match(gallery, /Click a phone to try the app/);
  assert.match(gallery, /Terra APP4: Baseline only/);
  assert.match(gallery, /Other 15: Final feature/);
  assert.match(text(gallery), /Mobile-layout web previews · not native-device or migration proof/);
  const css = read('practical/styles.css');
  assert.match(css, /\.mobile-models\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*1fr\)/);
  assert.match(css, /\.mobile-phones\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*1fr\)/);
  assert.match(css, /\.mobile-phones img\s*\{[^}]*aspect-ratio:\s*390\s*\/\s*844[^}]*object-fit:\s*contain/);
});

// Parent explicitly enables the file gate after verified image ingestion.
if (process.env.REQUIRE_MOBILE_IMAGES === '1') {
  test('all sixteen mobile image files exist after parent ingestion', () => {
    for (const path of imagePaths) assert.ok(existsSync(new URL(`../docs/${path}`, import.meta.url)), `Pending parent image copy: ${path}`);
  });
}

test('old practical route is only a relative redirect preserving explicit hashes at either hosting prefix', () => {
  assert.equal(sections(redirect).length, 0);
  assert.ok(redirect.length < 1600);
  assert.match(redirect, /href="\.\.\/"/);
  assert.doesNotMatch(redirect, /reveal|check-demo|http-equiv="refresh"/i);
  const code = redirect.match(/<script>([^]*?)<\/script>/)[1];
  for (const prefix of ['/', '/from-opcode-to-intent/']) {
    for (const hash of ['', '#/verify', '#/instantcalc-mobile', '#/intent-hierarchy']) {
      let destination;
      const link = { href: '../' };
      vm.runInNewContext(code, { document: { getElementById: () => link }, location: { hash, replace: value => { destination = value; } } });
      assert.equal(destination, `../${hash}`);
      assert.equal(link.href, destination);
      assert.equal(new URL(destination, `https://example.test${prefix}practical/`).href, `https://example.test${prefix}${hash}`);
    }
  }
});

test('audience HTML and public navigation documentation contain no edition labels or switches', () => {
  for (const entry of readdirSync(new URL('../docs/', import.meta.url), { recursive: true })) {
    if (!entry.endsWith('.html')) continue;
    const html = read(entry);
    assert.doesNotMatch(html, /(?:practical|original) edition|both editions|edition-link|Talk editions/i, entry);
    assert.doesNotMatch(html, /href="[^"\s]*practical\/(?:#|"|index\.html)/, entry);
  }
  for (const path of ['../README.md', 'docs/README.md', 'docs/practical/README.md']) {
    const url = path === '../README.md' ? new URL('../README.md', import.meta.url) : new URL(`../${path}`, import.meta.url);
    assert.doesNotMatch(readFileSync(url, 'utf8'), /(?:original|practical) edition|both editions|either edition/i, path);
  }
  const companion = read('instantcalc/index.html');
  assert.match(companion, /href="\.\.\/#\/bottleneck"/);
  assert.match(read('practical/sources.html'), /href="\.\.\/">← From Opcode to Intent/);
});

test('changed runtime assets carry current cache keys', () => {
  for (const asset of ['app.js', 'practical/styles.css', 'assets/intent-hierarchy.svg', 'assets/intent-counterpoint.svg']) {
    const digest = createHash('sha256').update(readFileSync(new URL(`../docs/${asset}`, import.meta.url))).digest('hex').slice(0, 12);
    assert.ok(canonical.includes(`"${asset}?v=${digest}"`), `${asset} must invalidate stale browser caches`);
  }
});

test('the complete acceptance slide is preserved except its number, relative paths and removed label', () => {
  // Pinned before benchmark integration; normalize only route promotion and presentation chrome.
  const normalized = slides.find(s => s[1] === 'verify')[0]
    .replace('Slide 22:', 'Slide 20:')
    .replace('href="practical/sources.html#exercise"', 'href="sources.html#exercise"')
    .replace('src="practical/assets/epam-logo.svg"', 'src="assets/epam-logo.svg"')
    .replace('<span>FROM OPCODE TO INTENT</span>', '<span>FROM OPCODE TO INTENT <b> / </b> PRACTICAL EDITION</span>');
  assert.equal(createHash('sha256').update(normalized).digest('hex'), 'a98fd429534e75780e2bcb8d5de67108c220c1e0ccfd3cbd1bc2f58ef7974bee');
});

async function runNavigation({ saved = {}, hash = '', blocked = false } = {}) {
  const store = new Map(Object.entries(saved)), elements = new Map(), handlers = new Map();
  for (const id of ['previous', 'next', 'slide-count', 'fullscreen', 'status']) elements.set(id, { addEventListener: (name, fn) => handlers.set(`${id}:${name}`, fn), setAttribute() {} });
  let index = hash ? Math.max(0, order.indexOf(hash.replace('#/', ''))) : 0;
  const events = new Map();
  const Reveal = {
    getSlides: () => order.map(id => ({ id })), getIndices: () => ({ h: index }), getTotalSlides: () => order.length,
    getCurrentSlide: () => ({ id: order[index] }), on: (event, fn) => events.set(event, fn),
    initialize: () => Promise.resolve(), slide: i => { index = i; events.get('slidechanged')?.(); },
    prev: () => { index = Math.max(0, index - 1); events.get('slidechanged')?.(); },
    next: () => { index = Math.min(order.length - 1, index + 1); events.get('slidechanged')?.(); },
  };
  vm.runInNewContext(read('app.js'), {
    Reveal, location: { hash }, matchMedia: () => ({ matches: true }),
    document: { querySelectorAll: () => order.map(id => ({ id })), getElementById: id => elements.get(id), fullscreenEnabled: false, addEventListener() {} },
    localStorage: { getItem: key => { if (blocked) throw Error('storage blocked'); return store.get(key) ?? null; }, setItem: (key, value) => { if (blocked) throw Error('storage blocked'); store.set(key, value); } },
  });
  await Promise.resolve();
  return { id: order[index], store, elements, handlers };
}
const key = 'opcode-to-intent:canonical:last-slide-id';
const practicalKey = 'opcode-to-intent:practical:last-slide-id';
const legacyKey = 'opcode-to-intent:practical:last-slide';

test('canonical storage restores IDs and migrates every frozen practical numeric position', async () => {
  assert.equal((await runNavigation({ saved: { [key]: 'instantcalc-mobile', [practicalKey]: 'verify' } })).id, 'instantcalc-mobile');
  const stable = await runNavigation({ saved: { [practicalKey]: 'intent-counterpoint' } });
  assert.equal(stable.id, 'intent-counterpoint');
  assert.equal(stable.store.get(key), 'intent-counterpoint');
  const legacy = order.filter(id => !['intent-hierarchy', 'intent-counterpoint', 'instantcalc-summary', 'instantcalc-mobile'].includes(id));
  assert.equal(legacy.length, 22);
  for (const [i, id] of legacy.entries()) assert.equal((await runNavigation({ saved: { [legacyKey]: String(i) } })).id, id);
  assert.equal((await runNavigation({ saved: { [practicalKey]: 'verify', [legacyKey]: '0' } })).id, 'verify');
});

test('explicit hashes win, old original positions stay isolated, invalid or blocked storage is safe', async () => {
  assert.equal((await runNavigation({ hash: '#/qa', saved: { [key]: 'verify', [practicalKey]: 'iceberg', [legacyKey]: '20' } })).id, 'qa');
  assert.equal((await runNavigation({ saved: { 'opcode-to-intent:original:last-slide-id': 'authors', 'opcode-to-intent:last-slide': '18' } })).id, 'title');
  for (const value of ['-1', '22', '1.5', '01', 'junk']) assert.equal((await runNavigation({ saved: { [legacyKey]: value } })).id, 'title');
  assert.equal((await runNavigation({ saved: { [key]: 'unknown', [practicalKey]: 'verify' } })).id, 'verify');
  assert.equal((await runNavigation({ blocked: true })).id, 'title');
  assert.equal((await runNavigation({ blocked: true, hash: '#/verify' })).id, 'verify');
});

test('canonical Previous/Next boundaries and count reflect all 26 slides', async () => {
  const first = await runNavigation();
  assert.equal(first.elements.get('previous').disabled, true);
  assert.equal(first.elements.get('slide-count').textContent, '01 / 26');
  first.handlers.get('next:click')();
  assert.equal(first.store.get(key), 'authors');
  const last = await runNavigation({ hash: '#/thank-you' });
  assert.equal(last.elements.get('next').disabled, true);
  assert.equal(last.elements.get('slide-count').textContent, '26 / 26');
  last.handlers.get('previous:click')();
  assert.equal(last.store.get(key), 'qa');
});
