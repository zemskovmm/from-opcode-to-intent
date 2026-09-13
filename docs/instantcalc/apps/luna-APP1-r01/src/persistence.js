const ACTIVE_ROW_KEY = 'instantcalc-demo:luna-APP1-r01:instant-calculator.active-row.v1';
const VARIABLES_KEY = 'instantcalc-demo:luna-APP1-r01:instant-calculator.variables.v1';

export function loadActiveRow(storage, rowCount = 10) {
  try {
    const value = Number(storage.getItem(ACTIVE_ROW_KEY));
    if (Number.isInteger(value) && value >= 0 && value < rowCount) return value;
  } catch {
    // An unavailable or malformed local store should not prevent calculation.
  }
  return 0;
}

export function saveActiveRow(storage, index, rowCount = 10) {
  if (!Number.isInteger(index) || index < 0 || index >= rowCount) return;
  try {
    storage.setItem(ACTIVE_ROW_KEY, String(index));
  } catch {
    // Local persistence is a convenience; keypad use should still work.
  }
}

export function loadVariables(storage, initialCount = 4) {
  try {
    const saved = JSON.parse(storage.getItem(VARIABLES_KEY));
    if (Array.isArray(saved)) {
      return saved.map((variable) => ({
        name: String(variable?.name ?? ''),
        value: String(variable?.value ?? ''),
      }));
    }
  } catch {
    // An unavailable or malformed local store should not prevent calculation.
  }
  return Array.from({ length: initialCount }, () => ({ name: '', value: '' }));
}

export function saveVariables(storage, variables) {
  try {
    storage.setItem(VARIABLES_KEY, JSON.stringify(variables));
  } catch {
    // Local persistence is a convenience; calculation should still work.
  }
}
