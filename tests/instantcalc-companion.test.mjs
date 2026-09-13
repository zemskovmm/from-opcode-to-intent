import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';

const root = new URL('../docs/instantcalc/', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const data = () => JSON.parse(read('data/benchmark.json'));
const digest = ids => createHash('sha256').update([...ids].sort().join('\n')).digest('hex');
const expected = {
  astra: ['qualified', 'qualified', 'qualified', 'app-failed'],
  sol: ['blocked', 'qualified', 'qualified', 'blocked'],
  terra: ['qualified', 'qualified', 'app-failed', 'blocked'],
  luna: ['blocked', 'blocked', 'blocked', 'app-failed'],
};

test('companion compares the sixteen final runs with separate quality dimensions', () => {
  const d = data(), html = read('index.html');
  assert.equal(d.runs.length, 16);
  assert.equal(new Set(d.runs.map(r => r.run_id)).size, 16);
  const rows = [...html.matchAll(/<tr data-run="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(rows.sort(), d.runs.map(r => r.run_id).sort());
  for (const r of d.runs) {
    assert.equal(r.classification, expected[r.model][Number(r.arm.slice(3)) - 1]);
    assert.equal(r.actual_charge, null);
    assert.ok(r.baseline.core && r.feature.core && r.feature.baseline_regressions);
    if (r.baseline.classification === 'app-failed') {
      assert.equal(r.baseline.core.passed, 8);
      assert.equal(r.baseline.F_statuses.F04, 'fail');
      const row = html.match(new RegExp(`<tr data-run="${r.run_id}"[^]*?</tr>`))[0];
      assert.match(row, /F04 fail/);
    }
    if (r.model === 'astra') assert.equal(r.known_estimate_usd, null);
  }
  assert.match(html, /<caption[^>]*>/);
  assert.match(html, /scope="col"/);
  assert.match(html, /scope="row"/);
  assert.match(html, /id="methods"/);
  assert.match(html, /original C08/);
  assert.match(html, /13\/5/);
  assert.match(html, /125 malformed/);
  assert.match(html, /no causal IDD/i);
  if (process.env.INSTANTCALC_FROZEN) {
    const f = JSON.parse(readFileSync(`${process.env.INSTANTCALC_FROZEN}/run-outcomes.json`, 'utf8'));
    const q = JSON.parse(readFileSync(`${process.env.INSTANTCALC_FROZEN}/quality-matrix.json`, 'utf8'));
    for (const r of d.runs) {
      const final = f.find(x => x.run_id === r.run_id);
      assert.equal(r.classification, final.classification);
      for (const phase of ['baseline', 'feature']) {
        const quality = q.find(x => x.run_id === r.run_id && x.phase === phase);
        for (const key of ['classification', 'core', 'robustness', 'baseline_regressions', 'F_statuses', 'app_repairs', 'selected_case_statuses']) assert.deepEqual(r[phase][key], quality[key]);
      }
    }
  }
});

test('four editable trees represent all 295 canonical events and sixteen final nodes once', () => {
  const d = data(), html = read('index.html');
  const ids = [], finals = [];
  for (const model of Object.keys(expected)) {
    assert.ok(html.includes(`href="trees/${model}.svg"`));
    const svg = read(`trees/${model}.svg`);
    assert.match(svg, /<svg[^>]*width="\d+"[^>]*height="\d+"/);
    assert.match(svg, /<title id="tree-title">/);
    assert.match(svg, /<desc id="tree-description">/);
    assert.match(svg, /fill="#fff"/);
    for (const m of svg.matchAll(/<g id="([^"]+)" data-stage="([^"]+)"/g)) {
      ids.push(m[1]);
      if (m[2] === 'final') finals.push(m[1]);
    }
    assert.equal((svg.match(/data-lane="APP[1-4]"/g) || []).length, 4);
  }
  assert.equal(ids.length, 295);
  assert.equal(new Set(ids).size, 295);
  assert.equal(finals.length, 16);
  assert.equal(new Set(finals).size, 16);
  assert.equal(digest(ids), 'c59ce5ca75f78945be15dc291b873c54294f959e4e38eaf950515253a990b383');
  assert.equal(digest(finals), '0adb6568841202fdbb181aaff57cdf9af5119cf60a2f7e1a36269f55ab65f699');
  assert.deepEqual(ids.sort(), d.events.map(e => e.id).sort());
  const eventSet = new Set(ids);
  for (const e of d.events) if (e.parent_id) assert.ok(eventSet.has(e.parent_id));
  assert.equal(d.events.filter(e => e.cost_scope === 'non-additive').length, 141);
  if (process.env.INSTANTCALC_FROZEN) {
    const canonical = readFileSync(`${process.env.INSTANTCALC_FROZEN}/events-derived-schema-v1.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
    for (const e of d.events) {
      const source = canonical.find(x => x.id === e.id);
      for (const key of ['id', 'parent_id', 'run_id', 'model', 'arm', 'stage', 'status', 'elapsed_s']) assert.deepEqual(e[key], source[key]);
      assert.equal(e.estimated_cost_usd === null, source.estimated_cost === null);
    }
  }
});

test('receipt sums preserve missing prices, interruptions, refinements and accounting scope', () => {
  const d = data();
  assert.equal(d.receipts.length, 154);
  assert.equal(new Set(d.receipts.map(p => p.id)).size, 154);
  assert.equal(d.receipts.filter(p => p.estimated_cost_usd === null).length, 35);
  const known = d.receipts.filter(p => p.estimated_cost_usd !== null);
  assert.equal(known.length, 119);
  const units = s => BigInt(s.replace('.', ''));
  assert.equal(known.reduce((sum, p) => sum + units(p.estimated_cost_usd), 0n), 1828016324n);
  assert.equal(d.accounting.known_total_usd_equivalent, '18.28016324');
  assert.equal(d.accounting.actual_charge, null);
  assert.equal(d.accounting.unique_response_count, 992);
  assert.equal(d.refinements.length, 44);
  assert.equal(d.receipts.filter(p => p.time_included).length, 151);
  for (const p of d.receipts) {
    assert.equal(p.time_included, p.status === 'complete' && p.elapsed_s !== null);
    assert.equal(p.actual_charge, null);
    if (p.id.startsWith('astra-')) assert.equal(p.estimated_cost_usd, null);
    assert.equal(d.events.find(e => e.id === p.id).estimated_cost_usd, p.estimated_cost_usd);
  }
  for (const r of d.runs) {
    const receipts = d.receipts.filter(p => p.run_id === r.run_id);
    const seconds = receipts.filter(p => p.time_included).reduce((s, p) => s + p.elapsed_s, 0);
    assert.ok(Math.abs(Number(r.observed_interval_s) - seconds) < 1e-7);
    assert.equal(r.missing_estimate_count, receipts.filter(p => p.estimated_cost_usd === null).length);
    assert.equal(r.refinement_rounds, d.refinements.filter(p => p.run_id === r.run_id).length);
  }
  for (const ref of d.refinements) {
    assert.ok(ref.event_ids.length > 0);
    for (const id of ref.event_ids) assert.ok(d.receipts.some(p => p.id === id));
  }
  const csv = read('data/comparison.csv').trim().split(/\r?\n/).map(line => line.split(','));
  assert.equal(csv.length, 17);
  for (const row of csv.slice(1)) {
    const record = Object.fromEntries(csv[0].map((key, i) => [key, row[i]]));
    const r = d.runs.find(r => r.run_id === record.run_id);
    assert.equal(record.classification, r.classification);
    assert.equal(record.known_estimate_usd, r.known_estimate_usd ?? 'unknown');
    assert.equal(record.actual_charge, 'unknown');
    assert.equal(record.observed_interval_s, r.observed_interval_s);
  }
});

test('public whitelist has no private traces and all runtime assets and links are prefix safe', () => {
  const manifest = JSON.parse(read('apps/manifest.json'));
  const runtimeFiles = new Map(manifest.apps.flatMap(a => a.files.map(f => [fileURLToPath(new URL(`apps/${a.run_id}/${f.path}`, root)), f.served_sha256])));
  const files = readdirSync(root, { recursive: true, withFileTypes: true }).filter(e => e.isFile());
  for (const entry of files) {
    const path = join(entry.parentPath ?? entry.path, entry.name);
    const content = readFileSync(path, 'utf8');
    assert.doesNotMatch(content, /\/(?:Users|private|root)\/|\.AI\/|thread_id|response_ids?|resp_[a-z0-9]|raw\/(?:logs|events)|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY|01a0[0-9a-f]{4}-[0-9a-f-]{27}/i, path);
    if (!/\.(?:html|svg|css)$/.test(entry.name)) continue;
    if (runtimeFiles.has(path)) {
      assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), runtimeFiles.get(path));
      assert.doesNotMatch(content, /<iframe\b|@import|https?:\/\/[^"')\s]+\.(?:js|css|woff)/i);
    } else {
      assert.doesNotMatch(content, /<script\b|<iframe\b|@import|https?:\/\/[^"')\s]+\.(?:js|css|woff)/i);
    }
    const refs = [...content.matchAll(/(?:href|src)="([^"]+)"|url\(['"]?([^)'" ]+)/g)].map(m => m[1] || m[2]);
    for (const ref of refs) {
      if (ref.startsWith('#') || ref.startsWith('data:') || ref.startsWith('https:')) continue;
      assert.ok(!ref.startsWith('/') && !ref.startsWith('http:'), ref);
      const target = new URL(ref, pathToFileURL(path));
      let local = fileURLToPath(target);
      if (local.endsWith('/')) local += 'index.html';
      assert.ok(existsSync(local), `${path}: ${ref}`);
    }
  }
});
