import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { classifyChanges, compareRows, initializeAcceptanceDemo } from '../docs/practical/check-demo.mjs';

const fixtureUrl = new URL('../docs/practical/change-fixture.json', import.meta.url);
const fixture = JSON.parse(readFileSync(fixtureUrl, 'utf8'));

test('fixture acceptance keeps staged and unstaged rows for the same file', () => {
  const observed = classifyChanges(fixture.statusText);

  assert.deepEqual(observed, fixture.expectedRows);
  assert.deepEqual(compareRows(observed, fixture.expectedRows), {
    pass: true,
    missing: [],
    extra: [],
  });
});

test('deliberate regression omits the fixture untracked row', () => {
  const observed = classifyChanges(fixture.statusText, { omitUntracked: true });
  const comparison = compareRows(observed, fixture.expectedRows);
  const untracked = fixture.expectedRows.filter(({ area }) => area === 'untracked');

  assert.equal(observed.some(({ area }) => area === 'untracked'), false);
  assert.deepEqual(comparison, { pass: false, missing: untracked, extra: [] });
});

function createElement({ checked = false, textContent = '' } = {}) {
  const listeners = new Map();
  return {
    checked,
    dataset: {},
    disabled: false,
    textContent,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    emit(type) {
      listeners.get(type)?.({ currentTarget: this });
    },
  };
}

function createDemoDom() {
  const regression = createElement();
  const run = createElement();
  const result = createElement({ textContent: 'Not run' });
  const observed = createElement();
  const expected = createElement();
  const detail = createElement();
  const elements = new Map([
    ['#demo-regression', regression],
    ['#demo-run', run],
    ['#demo-result', result],
    ['#demo-observed', observed],
    ['#demo-expected', expected],
    ['#demo-detail', detail],
  ]);
  return {
    root: {
      dataset: {},
      querySelector(selector) {
        return elements.get(selector) ?? null;
      },
    },
    regression,
    run,
    result,
    observed,
    expected,
    detail,
  };
}

test('browser exercise waits for the fixture and renders a passing acceptance check', async () => {
  const dom = createDemoDom();
  let requestUrl;
  const controller = initializeAcceptanceDemo(dom.root, {
    fetchImpl: async (url) => {
      requestUrl = url;
      return { ok: true, json: async () => fixture };
    },
  });

  assert.equal(dom.run.disabled, true);
  await controller.ready;
  assert.equal(requestUrl.pathname.endsWith('/docs/practical/change-fixture.json'), true);
  assert.equal(dom.root.dataset.ready, 'true');
  assert.equal(dom.run.disabled, false);
  assert.match(dom.expected.textContent, /staged \| modified \| both-staged-and-unstaged\.txt/);
  assert.match(dom.detail.textContent, /fixture ready/i);

  dom.run.emit('click');

  assert.equal(dom.result.textContent, 'PASS');
  assert.equal(dom.result.dataset.result, 'pass');
  assert.match(dom.observed.textContent, /untracked \| untracked \| untracked name\.txt/);
  assert.match(dom.expected.textContent, /staged \| modified \| both-staged-and-unstaged\.txt/);
  assert.match(dom.detail.textContent, /Matched 6 expected rows\./);
});

test('checking deliberate regression clears stale success and renders the missing row', async () => {
  const dom = createDemoDom();
  const controller = initializeAcceptanceDemo(dom.root, {
    fetchImpl: async () => ({ ok: true, json: async () => fixture }),
  });
  await controller.ready;
  dom.run.emit('click');

  dom.regression.checked = true;
  dom.regression.emit('change');

  assert.equal(dom.result.textContent, 'Not run');
  assert.equal(dom.result.dataset.result, undefined);
  assert.equal(dom.observed.textContent, '');
  assert.match(dom.expected.textContent, /untracked \| untracked \| untracked name\.txt/);

  dom.run.emit('click');

  assert.equal(dom.result.textContent, 'FAIL');
  assert.equal(dom.result.dataset.result, 'fail');
  assert.match(dom.detail.textContent, /Missing \(1\):\nuntracked \| untracked \| untracked name\.txt/);
  assert.match(dom.detail.textContent, /Extra \(0\):\n\(none\)/);
});

test('browser exercise displays a failed local fixture request and stays disabled', async () => {
  const dom = createDemoDom();
  const controller = initializeAcceptanceDemo(dom.root, {
    fetchImpl: async () => ({ ok: false, status: 404 }),
  });

  assert.equal(await controller.ready, null);
  assert.equal(dom.root.dataset.ready, 'false');
  assert.equal(dom.run.disabled, true);
  assert.equal(dom.result.textContent, 'Unable to load fixture: Fixture request failed (404).');
  assert.equal(dom.detail.textContent, 'The acceptance check cannot run until the local fixture loads.');
});
