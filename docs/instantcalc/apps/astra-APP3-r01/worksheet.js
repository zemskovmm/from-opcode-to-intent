export const ROW_COUNT = 10;
export const STORAGE_KEY = 'instantcalc-demo:astra-APP3-r01:working-calculator.v1';

export function loadWorksheet(storage) {
  let saved;
  try { saved = JSON.parse(storage.getItem(STORAGE_KEY)); } catch { /* Start empty if storage is unavailable. */ }
  return {
    expressions: Array.from({ length: ROW_COUNT }, (_, index) =>
      Array.isArray(saved?.expressions) && typeof saved.expressions[index] === 'string' ? saved.expressions[index] : ''),
    activeRow: Number.isInteger(saved?.activeRow) && saved.activeRow >= 0 && saved.activeRow < ROW_COUNT
      ? saved.activeRow : 0,
    variables: Array.isArray(saved?.variables) ? saved.variables.map(variable => ({
      name: typeof variable?.name === 'string' ? variable.name : '',
      value: typeof variable?.value === 'string' ? variable.value : '',
    })) : [],
  };
}

export function saveWorksheet(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function editExpression(text, start, end, insertion) {
  if (insertion === 'backspace') {
    if (start === end) start = Math.max(0, start - 1);
    insertion = '';
  }
  return {
    text: text.slice(0, start) + insertion + text.slice(end),
    cursor: start + insertion.length,
  };
}
