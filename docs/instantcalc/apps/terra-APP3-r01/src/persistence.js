import { ROW_COUNT } from './worksheet.js';

export const VARIABLE_COUNT = 5;

function normalizedExpressions(value) {
  return Array.from({ length: ROW_COUNT }, (_, index) => typeof value?.[index] === 'string' ? value[index] : '');
}

function normalizedActiveIndex(value) {
  return Number.isInteger(value) && value >= 0 && value < ROW_COUNT ? value : 0;
}

function normalizedVariables(value) {
  return Array.from({ length: VARIABLE_COUNT }, (_, index) => {
    const variable = value?.[index];
    if (!variable || typeof variable !== 'object') return {};
    const normalized = {};
    if (typeof variable.name === 'string' && variable.name) normalized.name = variable.name;
    if (typeof variable.value === 'string' && variable.value) normalized.value = variable.value;
    return normalized;
  });
}

export function parseWorksheetState(serialized) {
  try {
    const saved = JSON.parse(serialized);
    if (Array.isArray(saved)) {
      return { expressions: normalizedExpressions(saved), activeIndex: 0, variables: normalizedVariables() };
    }
    if (saved && typeof saved === 'object') {
      return {
        expressions: normalizedExpressions(saved.expressions),
        activeIndex: normalizedActiveIndex(saved.activeIndex),
        variables: normalizedVariables(saved.variables)
      };
    }
  } catch {
    // Invalid local data falls back to an empty worksheet.
  }
  return { expressions: normalizedExpressions(), activeIndex: 0, variables: normalizedVariables() };
}

export function serializeWorksheetState(expressions, activeIndex, variables) {
  return JSON.stringify({
    expressions: normalizedExpressions(expressions),
    activeIndex: normalizedActiveIndex(activeIndex),
    variables: normalizedVariables(variables)
  });
}
