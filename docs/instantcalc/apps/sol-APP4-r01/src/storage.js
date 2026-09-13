export const STORAGE_KEY = "instantcalc-demo:sol-APP4-r01:instant-calc:worksheet:v1";

export function initialWorksheet() {
  return {
    expressions: Array(10).fill(""),
    activeRow: 0,
    mode: "keypad",
    variables: [{ name: "", value: "" }],
  };
}

export function appendVariable(variables) {
  return [...variables, { name: "", value: "" }];
}

export function removeVariableAt(variables, index) {
  if (variables.length <= 1) return [{ name: "", value: "" }];
  return variables.filter((_, variableIndex) => variableIndex !== index);
}

export function restoreWorksheet(storage) {
  const fallback = initialWorksheet();

  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    if (
      ![1, 2].includes(saved?.version) ||
      !Array.isArray(saved.expressions) ||
      saved.expressions.length !== 10 ||
      !saved.expressions.every((expression) => typeof expression === "string") ||
      !Number.isInteger(saved.activeRow) ||
      saved.activeRow < 0 ||
      saved.activeRow > 9 ||
      !["keypad", "native"].includes(saved.mode) ||
      (saved.version === 2 &&
        (!Array.isArray(saved.variables) ||
          saved.variables.length < 1 ||
          !saved.variables.every(
            (variable) => typeof variable?.name === "string" && typeof variable?.value === "string",
          )))
    ) {
      return fallback;
    }

    return {
      expressions: [...saved.expressions],
      activeRow: saved.activeRow,
      mode: saved.mode,
      variables:
        saved.version === 2
          ? saved.variables.map(({ name, value }) => ({ name, value }))
          : [{ name: "", value: "" }],
    };
  } catch {
    return fallback;
  }
}

export function saveWorksheet(storage, worksheet) {
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, ...worksheet }));
}

export function removeWorksheet(storage) {
  storage.removeItem(STORAGE_KEY);
}
