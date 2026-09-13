const rowCount = 10;

function normalizedExpressions(expressions) {
  return Array.from({ length: rowCount }, (_, index) => String(expressions?.[index] ?? ''));
}

function normalizedActiveIndex(activeIndex) {
  return Number.isInteger(activeIndex) && activeIndex >= 0 && activeIndex < rowCount ? activeIndex : 0;
}

function normalizedVariables(variables) {
  if (!Array.isArray(variables)) return [];
  return variables.map((variable) => ({
    name: String(variable?.name ?? ''),
    value: String(variable?.value ?? ''),
  }));
}

export function serializeState(expressions, activeIndex, variables) {
  return JSON.stringify({
    expressions: normalizedExpressions(expressions),
    activeIndex: normalizedActiveIndex(activeIndex),
    variables: normalizedVariables(variables),
  });
}

export function deserializeState(saved) {
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      return { expressions: normalizedExpressions(parsed), activeIndex: 0, variables: [] };
    }
    return {
      expressions: normalizedExpressions(parsed?.expressions),
      activeIndex: normalizedActiveIndex(parsed?.activeIndex),
      variables: normalizedVariables(parsed?.variables),
    };
  } catch {
    return { expressions: normalizedExpressions(), activeIndex: 0, variables: [] };
  }
}
