const STORAGE_KEY = 'instantcalc-demo:terra-APP4-r01:instantcalc.expressions.v1';
const ACTIVE_ROW_KEY = 'instantcalc-demo:terra-APP4-r01:instantcalc.active-row.v1';
const EMPTY_ROWS = () => Array(10).fill('');

export function loadExpressions(storage) {
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null');
    if (!Array.isArray(saved)) return EMPTY_ROWS();
    return Array.from({ length: 10 }, (_, index) => typeof saved[index] === 'string' ? saved[index] : '');
  } catch {
    return EMPTY_ROWS();
  }
}

export function saveExpressions(storage, expressions) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(expressions));
  } catch {
    // Local storage is optional; the current session remains usable.
  }
}

export function loadActiveRow(storage) {
  try {
    const row = Number(storage?.getItem(ACTIVE_ROW_KEY));
    return Number.isInteger(row) && row >= 0 && row < 10 ? row : 0;
  } catch {
    return 0;
  }
}

export function saveActiveRow(storage, row) {
  try {
    if (Number.isInteger(row) && row >= 0 && row < 10) storage?.setItem(ACTIVE_ROW_KEY, String(row));
  } catch {
    // Local storage is optional; the current session remains usable.
  }
}
