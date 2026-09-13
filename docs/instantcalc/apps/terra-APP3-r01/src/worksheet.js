import { evaluateExpression } from './calculator.js';

export const ROW_COUNT = 10;

export function calculateRows(expressions, variables = {}) {
  const values = [];
  const results = [];

  for (let index = 0; index < ROW_COUNT; index += 1) {
    const result = evaluateExpression(expressions[index] ?? '', values, variables);
    results.push(result);
    values.push(result.kind === 'value' ? result.value : undefined);
  }

  return results;
}

export function calculateTotal(results) {
  return results.reduce((total, result) => {
    if (result.kind === 'value') {
      total.value += result.value;
      total.included += 1;
    } else if (result.kind !== 'empty') {
      total.excluded += 1;
    }
    return total;
  }, { value: 0, included: 0, excluded: 0 });
}
