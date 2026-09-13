const STORAGE_KEY = 'instantcalc-demo:sol-APP3-r01:tenfold-expressions';
const ACTIVE_ROW_KEY = 'instantcalc-demo:sol-APP3-r01:tenfold-active-row';
const VARIABLES_KEY = 'instantcalc-demo:sol-APP3-r01:tenfold-variables';
const ROW_COUNT = 10;

export function insertAtSelection(value, start, end, text) {
  const nextValue = value.slice(0, start) + text + value.slice(end);
  return { value: nextValue, selection: start + text.length };
}

export function backspaceAtSelection(value, start, end) {
  if (start !== end) return insertAtSelection(value, start, end, '');
  if (start === 0) return { value, selection: 0 };
  return {
    value: value.slice(0, start - 1) + value.slice(end),
    selection: start - 1,
  };
}

export function loadExpressions(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!Array.isArray(parsed)) throw new Error('Invalid worksheet');
    return Array.from({ length: ROW_COUNT }, (_, index) =>
      typeof parsed[index] === 'string' ? parsed[index] : '',
    );
  } catch {
    return Array(ROW_COUNT).fill('');
  }
}

export function saveExpressions(storage, expressions) {
  storage.setItem(STORAGE_KEY, JSON.stringify(expressions.slice(0, ROW_COUNT)));
}

export function loadActiveRow(storage) {
  try {
    const row = Number(storage.getItem(ACTIVE_ROW_KEY));
    return Number.isInteger(row) && row >= 0 && row < ROW_COUNT ? row : 0;
  } catch {
    return 0;
  }
}

export function saveActiveRow(storage, row) {
  storage.setItem(ACTIVE_ROW_KEY, String(row));
}

export function loadVariables(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(VARIABLES_KEY));
    if (!Array.isArray(parsed)) throw new Error('Invalid variables');
    return parsed.map((variable) => ({
      name: typeof variable?.name === 'string' ? variable.name : '',
      value: typeof variable?.value === 'string' ? variable.value : '',
    }));
  } catch {
    return [];
  }
}

export function saveVariables(storage, variables) {
  storage.setItem(VARIABLES_KEY, JSON.stringify(variables));
}
