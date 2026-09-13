// Keep the original key so upgrading does not discard existing expressions.
export const STORAGE_KEY = 'instantcalc-demo:luna-APP2-r01:instant-calculator.rows.v1';
export const ROW_COUNT = 10;

function normalizedRows(rows) {
  return Array.from({ length: ROW_COUNT }, (_, index) => typeof rows?.[index] === 'string' ? rows[index] : '');
}

function normalizedActiveRow(activeRow) {
  return Number.isInteger(activeRow) && activeRow >= 0 && activeRow < ROW_COUNT ? activeRow : 0;
}

function normalizedVariables(variables) {
  if (!Array.isArray(variables)) return [];
  return variables.map((variable) => ({
    name: typeof variable?.name === 'string' ? variable.name : '',
    value: typeof variable?.value === 'string' ? variable.value : ''
  }));
}

export function loadWorkspace(storage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) {
      return { rows: normalizedRows(saved), activeRow: 0, variables: [] };
    }
    if (saved && typeof saved === 'object') {
      return {
        rows: normalizedRows(saved.rows),
        activeRow: normalizedActiveRow(saved.activeRow),
        variables: normalizedVariables(saved.variables)
      };
    }
  } catch {
    // A fresh workspace is the safest fallback if stored data is unavailable.
  }
  return { rows: Array(ROW_COUNT).fill(''), activeRow: 0, variables: [] };
}

export function saveWorkspace(storage, rows, activeRow, variables = []) {
  storage.setItem(STORAGE_KEY, JSON.stringify({
    rows: normalizedRows(rows),
    activeRow: normalizedActiveRow(activeRow),
    variables: normalizedVariables(variables)
  }));
}
