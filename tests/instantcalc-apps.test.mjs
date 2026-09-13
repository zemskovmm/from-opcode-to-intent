import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const root = new URL('../docs/instantcalc/', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const sha = b => createHash('sha256').update(b).digest('hex');
const keys = {
  'astra-APP1-r01': ['instant-workpad.v1'],
  'astra-APP2-r01': ['instantcalc.worksheet.v1'],
  'astra-APP3-r01': ['working-calculator.v1'],
  'astra-APP4-r01': ['instantcalc.rows.v1', 'instantcalc.variables.v1', 'instantcalc.activeRow.v1'],
  'sol-APP1-r01': ['tenfold.worksheet.v1'],
  'sol-APP2-r01': ['instantcalc.sheet', 'instantcalc.activeLine', 'instantcalc.variables'],
  'sol-APP3-r01': ['tenfold-expressions', 'tenfold-active-row', 'tenfold-variables'],
  'sol-APP4-r01': ['instant-calc:worksheet:v1'],
  'terra-APP1-r01': ['instant-calculator-expressions-v1'],
  'terra-APP2-r01': ['instantcalc-v1'],
  'terra-APP3-r01': ['instantcalc.expressions.v1'],
  'terra-APP4-r01': ['instantcalc.expressions.v1', 'instantcalc.active-row.v1'],
  'luna-APP1-r01': ['instant-calculator.rows.v1', 'instant-calculator.active-row.v1', 'instant-calculator.variables.v1'],
  'luna-APP2-r01': ['instant-calculator.rows.v1'],
  'luna-APP3-r01': ['instant-calculator.rows.v1', 'instant-calculator.active-row.v1', 'instant-calculator.variables.v1'],
  'luna-APP4-r01': ['instant-calculator-workspace-v1'],
};

test('all sixteen hosting copies retain screenshot pins, known outcomes and disjoint complete storage keys', () => {
  const manifest = JSON.parse(read('apps/manifest.json'));
  const benchmark = JSON.parse(read('data/benchmark.json'));
  const images = JSON.parse(read('mobile/manifest.json')).rows;
  assert.equal(manifest.apps.length, 16);
  assert.equal(manifest.apps.filter(a => a.phase === 'feature').length, 15);
  assert.equal(manifest.apps.filter(a => a.phase === 'baseline').length, 1);
  const servedKeys = [];
  for (const app of manifest.apps) {
    const run = benchmark.runs.find(r => r.run_id === app.run_id);
    const image = images.find(r => r.run_id === app.run_id);
    assert.equal(app.source_commit, run[app.phase].final_commit);
    assert.equal(app.source_commit, image.source_commit);
    assert.equal(app.phase, image.phase);
    assert.equal(app.classification, run.classification);
    assert.deepEqual(app.storage_keys.map(k => k.original).sort(), [...keys[app.run_id]].sort());
    for (const key of app.storage_keys) {
      assert.equal(key.served, `instantcalc-demo:${app.run_id}:${key.original}`);
      assert.ok(key.locations.length > 0);
      servedKeys.push(key.served);
    }
    assert.ok(app.storage_accesses.length >= 2);
    assert.ok(app.storage_surfaces.some(s => s.source.includes('localStorage')));
  }
  assert.equal(servedKeys.length, 27);
  assert.equal(new Set(servedKeys).size, servedKeys.length);
  assert.deepEqual(manifest.original_collisions.map(c => c.key).sort(), [
    'instantcalc.expressions.v1', 'instant-calculator.rows.v1',
    'instant-calculator.active-row.v1', 'instant-calculator.variables.v1',
  ].sort());
});

test('runtime files match hashes and only declared literal storage and URL adaptations', () => {
  const manifest = JSON.parse(read('apps/manifest.json'));
  for (const app of manifest.apps) {
    const files = readdirSync(new URL(`apps/${app.run_id}/`, root), { recursive: true, withFileTypes: true }).filter(e => e.isFile());
    assert.equal(files.length, app.files.length);
    for (const file of app.files) {
      const served = read(`apps/${app.run_id}/${file.path}`);
      assert.equal(sha(served), file.served_sha256);
      let original = served;
      // Offsets are Unicode code points in the original source, applied right-to-left.
      for (const change of [...file.replacements].sort((a, b) => a.start - b.start)) {
        const chars = [...original];
        assert.equal(chars.slice(change.start, change.start + [...change.after].length).join(''), change.after);
        chars.splice(change.start, [...change.after].length, ...change.before);
        original = chars.join('');
        assert.ok(['storage-key', 'relative-url'].includes(change.kind));
        if (change.kind === 'storage-key') assert.equal(change.after, `instantcalc-demo:${app.run_id}:${change.before}`);
        else assert.equal(change.after, '.' + change.before);
      }
      assert.equal(sha(original), file.source_sha256);
      assert.doesNotMatch(file.path, /(?:^|\/)(?:\.|test|server|scripts|debug|package|AGENTS|RUN)/i);
      assert.doesNotMatch(served, /indexedDB|serviceWorker|sessionStorage|localStorage\s*\[|(?:localStorage|sessionStorage|storage)\??\.clear\s*\(|https?:\/\/(?:localhost|127\.)/);
    }
  }
});

test('app directory provides all live apps, full-size originals and return links', () => {
  const html = read('apps/index.html');
  assert.match(html, /href="\.\.\/\.\.\/#\/instantcalc-mobile"/);
  assert.match(html, /href="\.\.\/"/);
  assert.match(html, /demonstration copies/i);
  assert.match(read('index.html'), /href="apps\/"/);
  for (const id of Object.keys(keys)) {
    assert.match(html, new RegExp(`href="${id}/"`));
    assert.match(html, new RegExp(`href="../mobile/${id}\\.webp"`));
  }
});

test('maintained exporter verifies pinned source closure and public safety without writing', () => {
  const args = ['scripts/export-instantcalc-apps.py', '--check'];
  if (process.env.INSTANTCALC_SOURCE_ROOT) args.push('--source-root', process.env.INSTANTCALC_SOURCE_ROOT);
  execFileSync('python3', args, { cwd: new URL('../', import.meta.url), stdio: 'pipe' });
});

test('every runtime link resolves within its own app at root and repository prefixes', () => {
  const manifest = JSON.parse(read('apps/manifest.json'));
  for (const app of manifest.apps) {
    const paths = new Set(app.files.map(f => f.path));
    for (const file of app.files) {
      const content = read(`apps/${app.run_id}/${file.path}`);
      const refs = [...content.matchAll(/(?:href|src)=["']([^"']+)["']|\b(?:from|import)\s+["']([^"']+)["']|url\(["']?([^)'"\s]+)/g)].map(m => m[1] || m[2] || m[3]);
      for (const prefix of ['/', '/from-opcode-to-intent/']) {
        const base = `https://example.test${prefix}instantcalc/apps/${app.run_id}/`;
        for (const ref of refs) {
          if (ref.startsWith('#') || ref.startsWith('data:')) continue;
          const url = new URL(ref, base + file.path);
          assert.ok(url.href.startsWith(base), `${app.run_id}/${file.path}: ${ref}`);
          let path = url.pathname.slice(new URL(base).pathname.length);
          if (!path || path.endsWith('/')) path += 'index.html';
          assert.ok(paths.has(path), `${app.run_id}/${file.path}: ${ref}`);
        }
      }
    }
  }
});
