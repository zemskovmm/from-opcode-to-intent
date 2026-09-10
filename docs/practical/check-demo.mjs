const CHANGE_BY_STATUS = {
  A: 'added',
  M: 'modified',
};

function changeFor(status) {
  const change = CHANGE_BY_STATUS[status];
  if (!change) {
    throw new Error(`Fixture contains unsupported status: ${status}`);
  }
  return change;
}

function rowKey({ area, change, path }) {
  return `${area}\u0000${change}\u0000${path}`;
}

export function classifyChanges(statusText, { omitUntracked = false } = {}) {
  const rows = [];

  for (const record of statusText.split('\u0000')) {
    if (!record) continue;

    const path = record.slice(3);
    const x = record[0];
    const y = record[1];

    if (x === '?' && y === '?') {
      if (!omitUntracked) rows.push({ area: 'untracked', change: 'untracked', path });
      continue;
    }

    if (x === '!' && y === '!') {
      rows.push({ area: 'ignored', change: 'ignored', path });
      continue;
    }

    if (x !== ' ') rows.push({ area: 'staged', change: changeFor(x), path });
    if (y !== ' ') rows.push({ area: 'unstaged', change: changeFor(y), path });
  }

  return rows;
}

export function compareRows(observedRows, expectedRows) {
  const observed = new Map();
  const expected = new Map();

  for (const row of observedRows) observed.set(rowKey(row), (observed.get(rowKey(row)) ?? 0) + 1);
  for (const row of expectedRows) expected.set(rowKey(row), (expected.get(rowKey(row)) ?? 0) + 1);

  const missing = [];
  const extra = [];

  for (const row of expectedRows) {
    const key = rowKey(row);
    const count = observed.get(key) ?? 0;
    if (count > 0) observed.set(key, count - 1);
    else missing.push(row);
  }

  for (const row of observedRows) {
    const key = rowKey(row);
    const count = expected.get(key) ?? 0;
    if (count > 0) expected.set(key, count - 1);
    else extra.push(row);
  }

  return { pass: missing.length === 0 && extra.length === 0, missing, extra };
}

function formatRows(rows) {
  return rows.length === 0
    ? '(none)'
    : rows.map(({ area, change, path }) => `${area} | ${change} | ${path}`).join('\n');
}

function resetResult(elements, detail) {
  elements.result.textContent = 'Not run';
  delete elements.result.dataset.result;
  elements.observed.textContent = '';
  elements.detail.textContent = detail;
}

function describeComparison(comparison, expectedRows) {
  if (comparison.pass) return `Matched ${expectedRows.length} expected rows.`;

  return [
    `Missing (${comparison.missing.length}):`,
    formatRows(comparison.missing),
    `Extra (${comparison.extra.length}):`,
    formatRows(comparison.extra),
  ].join('\n');
}

export function initializeAcceptanceDemo(
  root = typeof document === 'undefined' ? null : document.querySelector('#acceptance-demo'),
  { fetchImpl = globalThis.fetch } = {},
) {
  if (!root) return null;

  const elements = {
    regression: root.querySelector('#demo-regression'),
    run: root.querySelector('#demo-run'),
    result: root.querySelector('#demo-result'),
    observed: root.querySelector('#demo-observed'),
    expected: root.querySelector('#demo-expected'),
    detail: root.querySelector('#demo-detail'),
  };
  if (Object.values(elements).some((element) => !element)) return null;

  let fixture;
  elements.run.disabled = true;

  elements.regression.addEventListener('change', () => {
    resetResult(
      elements,
      elements.regression.checked
        ? 'Deliberate regression enabled: untracked rows will be omitted.'
        : 'Fixture ready.',
    );
  });

  elements.run.addEventListener('click', () => {
    if (!fixture) return;

    const observedRows = classifyChanges(fixture.statusText, {
      omitUntracked: elements.regression.checked,
    });
    const comparison = compareRows(observedRows, fixture.expectedRows);

    elements.observed.textContent = formatRows(observedRows);
    elements.expected.textContent = formatRows(fixture.expectedRows);
    elements.result.textContent = comparison.pass ? 'PASS' : 'FAIL';
    elements.result.dataset.result = comparison.pass ? 'pass' : 'fail';
    elements.detail.textContent = describeComparison(comparison, fixture.expectedRows);
  });

  const ready = (async () => {
    try {
      const response = await fetchImpl(new URL('./change-fixture.json', import.meta.url));
      if (!response.ok) throw new Error(`Fixture request failed (${response.status}).`);
      fixture = await response.json();
      elements.expected.textContent = formatRows(fixture.expectedRows);
      elements.detail.textContent = 'Recorded fixture ready. This checks categorization only.';
      root.dataset.ready = 'true';
      elements.run.disabled = false;
      return fixture;
    } catch (error) {
      root.dataset.ready = 'false';
      elements.run.disabled = true;
      elements.result.textContent = `Unable to load fixture: ${error.message}`;
      delete elements.result.dataset.result;
      elements.detail.textContent = 'The acceptance check cannot run until the local fixture loads.';
      return null;
    }
  })();

  return { ready };
}

function initializeWhenReady() {
  initializeAcceptanceDemo();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWhenReady, { once: true });
  } else {
    initializeWhenReady();
  }
}
