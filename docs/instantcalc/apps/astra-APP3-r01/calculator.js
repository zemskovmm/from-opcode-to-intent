class CalculationIssue extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const unfinished = () => { throw new CalculationIssue('incomplete', 'Keep typing'); };
const invalid = (message) => { throw new CalculationIssue('error', message); };

function tokenize(expression) {
  const text = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  const tokens = [];
  let index = 0;
  while (index < text.length) {
    const rest = text.slice(index);
    if (/^\s/.test(rest)) { index++; continue; }
    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    const reference = rest.match(/^\$(\d+)/);
    const variable = rest.match(/^@([a-z][a-z0-9_]*)/);
    if (number) {
      tokens.push({ type: 'number', value: Number(number[0]) });
      index += number[0].length;
    } else if (reference) {
      tokens.push({ type: 'reference', value: Number(reference[1]) });
      index += reference[0].length;
    } else if (variable) {
      tokens.push({ type: 'variable', value: variable[1] });
      index += variable[0].length;
    } else if (rest.startsWith('sqrt')) {
      tokens.push({ type: 'sqrt' });
      index += 4;
    } else if ('+-*/^()%√x'.includes(rest[0])) {
      tokens.push({ type: rest[0] === 'x' ? '*' : rest[0] });
      index++;
    } else if (['@', '$', '.', 's', 'sq', 'sqr'].includes(rest.trim())) {
      unfinished();
    } else {
      invalid('Check this expression');
    }
  }
  tokens.push({ type: 'end' });
  return tokens;
}

function evaluate(expression, earlierRows, variables) {
  const tokens = tokenize(expression);
  let position = 0;
  const peek = () => tokens[position].type;
  const accept = (type) => peek() === type && Boolean(++position);
  const expect = (type) => {
    if (accept(type)) return;
    if (peek() === 'end') unfinished();
    invalid(type === ')' ? 'Check the parentheses' : 'Check this expression');
  };
  const finite = (value) => {
    if (Number.isNaN(value)) invalid('Use real numbers only');
    if (!Number.isFinite(value)) invalid('Result is too large');
    return value;
  };
  const root = (value) => {
    if (value < 0) invalid('Square root needs a non-negative number');
    return Math.sqrt(value);
  };

  function primary() {
    const token = tokens[position];
    if (accept('number')) return finite(token.value);
    if (accept('variable')) {
      const variable = variables.get(token.value);
      if (!variable) invalid(`Unknown variable @${token.value}`);
      if (variable.status !== 'ok') {
        throw new CalculationIssue('blocked', `Check @${token.value}: ${variable.message}`);
      }
      return variable.value;
    }
    if (accept('reference')) {
      if (token.value < 1 || token.value > earlierRows.length) {
        invalid('Reference an earlier line only');
      }
      const source = earlierRows[token.value - 1];
      if (source.status !== 'ok') {
        throw new CalculationIssue('blocked', `Waiting for line ${token.value}`);
      }
      return source.value;
    }
    if (accept('(')) {
      const value = sum();
      expect(')');
      return value;
    }
    if (accept('sqrt')) {
      expect('(');
      const value = sum();
      expect(')');
      return root(value);
    }
    if (accept('√')) return root(unary());
    if (peek() === 'end') unfinished();
    invalid('Check this expression');
  }

  function power() {
    let value = primary();
    while (accept('%')) value /= 100;
    if (accept('^')) value = finite(value ** unary());
    return value;
  }

  function unary() {
    if (accept('+')) return unary();
    if (accept('-')) return -unary();
    return power();
  }

  function product() {
    let value = unary();
    while (peek() === '*' || peek() === '/') {
      const operator = tokens[position++].type;
      const right = unary();
      if (operator === '/' && right === 0) invalid('Cannot divide by zero');
      value = finite(operator === '*' ? value * right : value / right);
    }
    return value;
  }

  function sum() {
    let value = product();
    while (peek() === '+' || peek() === '-') {
      const operator = tokens[position++].type;
      const right = product();
      value = finite(operator === '+' ? value + right : value - right);
    }
    return value;
  }

  const value = sum();
  if (peek() !== 'end') invalid('Check this expression');
  return finite(value);
}

export function calculateWorksheet(expressions, variables = []) {
  const values = new Map(validateVariables(variables).map(variable => [variable.name, variable]));
  const rows = [];
  for (const expression of expressions) {
    if (!expression.trim()) {
      rows.push({ status: 'empty' });
      continue;
    }
    try {
      rows.push({ status: 'ok', value: evaluate(expression, rows, values) });
    } catch (error) {
      if (error instanceof CalculationIssue) {
        rows.push({ status: error.status, message: error.message });
      } else if (error instanceof RangeError) {
        rows.push({ status: 'error', message: 'Try a shorter expression' });
      } else {
        throw error;
      }
    }
  }
  return rows;
}

export function formatResult(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function validateVariables(variables) {
  const counts = new Map();
  for (const { name } of variables) counts.set(name.trim(), (counts.get(name.trim()) ?? 0) + 1);
  return variables.map(({ name, value }) => {
    name = name.trim();
    value = value.trim();
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      return { name, status: 'error', message: 'Start with a lowercase letter; use a–z, 0–9, or _' };
    }
    if (counts.get(name) > 1) return { name, status: 'error', message: 'Duplicate name' };
    if (['', '-', '+', '.', '-.', '+.'].includes(value)) {
      return { name, status: 'incomplete', message: 'Enter a number' };
    }
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) || !Number.isFinite(Number(value))) {
      return { name, status: 'error', message: 'Use a finite decimal number, not an expression' };
    }
    return { name, status: 'ok', value: Number(value) };
  });
}

export function totalWorksheet(rows) {
  let value = 0;
  const included = [];
  const excluded = [];
  rows.forEach((row, index) => {
    if (row.status === 'ok') {
      included.push(index + 1);
      value += row.value;
    } else {
      excluded.push({ line: index + 1, status: row.status, message: row.message ?? 'Blank line' });
    }
  });
  return Number.isFinite(value)
    ? { status: 'ok', value, included, excluded }
    : { status: 'error', message: 'Total is too large', included, excluded };
}
