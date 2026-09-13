export const SHEET_SIZE = 10;
export const STORAGE_KEY = "instantcalc-demo:sol-APP2-r01:instantcalc.sheet";
export const ACTIVE_LINE_KEY = "instantcalc-demo:sol-APP2-r01:instantcalc.activeLine";
export const VARIABLE_STORAGE_KEY = "instantcalc-demo:sol-APP2-r01:instantcalc.variables";

export function blankSheet() {
  return Array.from({ length: SHEET_SIZE }, () => "");
}

export function loadExpressions(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== "string")) {
      return blankSheet();
    }
    return [...parsed.slice(0, SHEET_SIZE), ...blankSheet()].slice(0, SHEET_SIZE);
  } catch {
    return blankSheet();
  }
}

export function saveExpressions(storage, expressions) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(expressions));
    return true;
  } catch {
    return false;
  }
}

export function loadActiveLine(storage) {
  try {
    const index = Number(storage.getItem(ACTIVE_LINE_KEY));
    return Number.isInteger(index) && index >= 0 && index < SHEET_SIZE ? index : 0;
  } catch {
    return 0;
  }
}

export function saveActiveLine(storage, index) {
  try {
    storage.setItem(ACTIVE_LINE_KEY, String(index));
    return true;
  } catch {
    return false;
  }
}

export function loadVariables(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(VARIABLE_STORAGE_KEY));
    if (
      !Array.isArray(parsed) ||
      parsed.some(
        (row) =>
          typeof row !== "object" ||
          row === null ||
          typeof row.name !== "string" ||
          typeof row.value !== "string",
      )
    ) {
      return [];
    }
    return parsed.map(({ name, value }) => ({ name, value }));
  } catch {
    return [];
  }
}

export function saveVariables(storage, variables) {
  try {
    storage.setItem(VARIABLE_STORAGE_KEY, JSON.stringify(variables));
    return true;
  } catch {
    return false;
  }
}

export function insertAtSelection(expression, insertion, start, end) {
  const updated = expression.slice(0, start) + insertion + expression.slice(end);
  return { expression: updated, caret: start + insertion.length };
}

export function deleteAtSelection(expression, start, end) {
  if (start !== end) {
    return { expression: expression.slice(0, start) + expression.slice(end), caret: start };
  }
  if (start === 0) return { expression, caret: 0 };
  return {
    expression: expression.slice(0, start - 1) + expression.slice(end),
    caret: start - 1,
  };
}
