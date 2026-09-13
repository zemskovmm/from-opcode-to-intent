export const STORAGE_KEY = 'instantcalc-demo:astra-APP1-r01:instant-workpad.v1';
export const freshWorkspace = () => ({ expressions: Array(10).fill(''), active: 0, advanced: false, variables: [] });
export function restoreWorkspace(storage) {
  const state = freshWorkspace();
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved?.expressions)) return state;
    state.expressions = state.expressions.map((_, i) => typeof saved.expressions[i] === 'string' ? saved.expressions[i].slice(0, 500) : '');
    state.active = Number.isInteger(saved.active) && saved.active >= 0 && saved.active < 10 ? saved.active : 0;
    state.advanced = saved.advanced === true;
    if (Array.isArray(saved.variables)) {
      state.variables = saved.variables.filter(variable => variable && typeof variable === 'object' && !Array.isArray(variable)).map(variable => ({
        name: typeof variable.name === 'string' ? variable.name.slice(0, 32) : '',
        value: typeof variable.value === 'string' ? variable.value.slice(0, 500) : '',
      }));
    }
  } catch { /* A disabled or damaged store must not prevent calculations. */ }
  return state;
}
export function saveWorkspace(storage, state) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
// null means backspace; an empty string deletes the current selection.
export function editExpression(expression, start, end, insertion) {
  if (insertion === null) {
    if (start === end) start = Math.max(0, start - 1);
    insertion = '';
  }
  insertion = insertion.slice(0, Math.max(0, 500 - expression.length + end - start));
  return { expression: expression.slice(0, start) + insertion + expression.slice(end), cursor: start + insertion.length };
}
export function nextRow(active) { return Math.min(9, active + 1); }
export function newVariableName(variables) {
  const names = new Set(variables.map(variable => variable.name.trim()));
  let index = 1;
  while (names.has(`v${index}`)) index++;
  return `v${index}`;
}
export function clearCalculations(state) {
  return { ...state, expressions: Array(10).fill(''), active: 0 };
}
