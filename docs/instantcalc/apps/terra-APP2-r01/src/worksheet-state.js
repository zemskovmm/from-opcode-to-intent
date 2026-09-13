const EMPTY_EXPRESSIONS = Array(10).fill('');

function validExpressions(expressions) {
  return Array.isArray(expressions) && expressions.length === 10 && expressions.every((value) => typeof value === 'string');
}

function validVariables(variables) {
  return Array.isArray(variables) && variables.every((variable) => variable && typeof variable.name === 'string' && typeof variable.value === 'string');
}

export function restoreWorksheet(savedValue) {
  try {
    const saved = JSON.parse(savedValue);
    if (validExpressions(saved)) return { expressions: [...saved], activeIndex: 0, variables: [] };
    if (validExpressions(saved?.expressions)) {
      return {
        expressions: [...saved.expressions],
        activeIndex: Number.isInteger(saved.activeIndex) && saved.activeIndex >= 0 && saved.activeIndex < 10 ? saved.activeIndex : 0,
        variables: validVariables(saved.variables) ? saved.variables.map((variable) => ({ ...variable })) : []
      };
    }
  } catch { /* A missing or invalid saved sheet starts empty. */ }
  return { expressions: [...EMPTY_EXPRESSIONS], activeIndex: 0, variables: [] };
}

export function serializeWorksheet(expressions, activeIndex, variables = []) {
  return JSON.stringify({ expressions, activeIndex, variables });
}
