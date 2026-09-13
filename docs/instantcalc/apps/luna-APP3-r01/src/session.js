export const ROW_COUNT = 10;
export const STORAGE_KEY = 'instantcalc-demo:luna-APP3-r01:instant-calculator.rows.v1';
export const ACTIVE_ROW_KEY = 'instantcalc-demo:luna-APP3-r01:instant-calculator.active-row.v1';
export const VARIABLES_KEY = 'instantcalc-demo:luna-APP3-r01:instant-calculator.variables.v1';

function validIndex(value) {
  return Number.isInteger(value) && value >= 0 && value < ROW_COUNT;
}

export function restoreSession(storage) {
  let expressions = Array(ROW_COUNT).fill('');
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) expressions = Array.from({ length: ROW_COUNT }, (_, index) => String(saved[index] ?? ''));
  } catch {
    // Missing or unreadable saved data starts with a blank workspace.
  }

  const savedIndex = Number.parseInt(storage.getItem(ACTIVE_ROW_KEY), 10);
  let variables = [];
  try {
    const savedVariables = JSON.parse(storage.getItem(VARIABLES_KEY));
    if (Array.isArray(savedVariables)) {
      variables = savedVariables
        .filter((variable) => variable && typeof variable === 'object')
        .map((variable) => ({ name: String(variable.name ?? ''), value: String(variable.value ?? '') }));
    }
  } catch {
    // Missing or unreadable variable data starts with no variables.
  }

  return { expressions, activeIndex: validIndex(savedIndex) ? savedIndex : 0, variables };
}

export function saveSession(storage, expressions, activeIndex, variables = []) {
  const normalizedExpressions = Array.from({ length: ROW_COUNT }, (_, index) => String(expressions[index] ?? ''));
  storage.setItem(STORAGE_KEY, JSON.stringify(normalizedExpressions));
  storage.setItem(ACTIVE_ROW_KEY, String(validIndex(activeIndex) ? activeIndex : 0));
  storage.setItem(VARIABLES_KEY, JSON.stringify(variables.map((variable) => ({
    name: String(variable.name ?? ''),
    value: String(variable.value ?? ''),
  }))));
}
