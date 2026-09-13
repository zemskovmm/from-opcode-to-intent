class ExpressionError extends Error {
  constructor(state, message, line) {
    super(message);
    this.state = state;
    this.line = line;
  }
}

const isDigit = (character) => character >= '0' && character <= '9';

function tokenize(source) {
  const tokens = [];
  let position = 0;

  while (position < source.length) {
    const character = source[position];

    if (/\s/.test(character)) {
      position += 1;
      continue;
    }

    if ('+-*/%()'.includes(character)) {
      tokens.push({ type: character, value: character });
      position += 1;
      continue;
    }

    if (character === '$') {
      let end = position + 1;
      while (end < source.length && isDigit(source[end])) end += 1;
      if (end === position + 1) {
        throw new ExpressionError('invalid', 'Invalid expression');
      }
      tokens.push({ type: 'reference', value: Number(source.slice(position + 1, end)) });
      position = end;
      continue;
    }

    if (character === '@') {
      const match = source.slice(position).match(/^@([A-Za-z][A-Za-z0-9_]*)/);
      if (!match) {
        throw new ExpressionError('invalid', 'Invalid expression');
      }
      tokens.push({ type: 'variable', value: match[1] });
      position += match[0].length;
      continue;
    }

    if (isDigit(character) || character === '.') {
      const match = source.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) throw new ExpressionError('invalid', 'Invalid expression');
      tokens.push({ type: 'number', value: Number(match[0]) });
      position += match[0].length;
      continue;
    }

    throw new ExpressionError('invalid', 'Invalid expression');
  }

  return tokens;
}

function assertFinite(value) {
  if (!Number.isFinite(value)) {
    throw new ExpressionError('invalid', 'Cannot calculate');
  }
  return value;
}

function parseTokens(tokens, resolveReference, resolveVariable) {
  let position = 0;

  const current = () => tokens[position];

  function parseExpression() {
    let value = parseTerm();
    while (current()?.type === '+' || current()?.type === '-') {
      const operator = tokens[position++].type;
      const right = parseTerm();
      value = assertFinite(operator === '+' ? value + right : value - right);
    }
    return value;
  }

  function parseTerm() {
    let value = parseUnary();
    while (current()?.type === '*' || current()?.type === '/') {
      const operator = tokens[position++].type;
      const right = parseUnary();
      if (operator === '/' && right === 0) {
        throw new ExpressionError('invalid', 'Cannot calculate');
      }
      value = assertFinite(operator === '*' ? value * right : value / right);
    }
    return value;
  }

  function parseUnary() {
    if (current()?.type === '+' || current()?.type === '-') {
      const operator = tokens[position++].type;
      const value = parseUnary();
      return assertFinite(operator === '-' ? -value : value);
    }
    return parsePercentage();
  }

  function parsePercentage() {
    let value = parsePrimary();
    while (current()?.type === '%') {
      position += 1;
      value = assertFinite(value / 100);
    }
    return value;
  }

  function parsePrimary() {
    const token = current();

    if (!token) {
      throw new ExpressionError('unfinished', 'Unfinished');
    }

    if (token.type === 'number') {
      position += 1;
      return token.value;
    }

    if (token.type === 'reference') {
      position += 1;
      return resolveReference(token.value);
    }

    if (token.type === 'variable') {
      position += 1;
      return resolveVariable(token.value);
    }

    if (token.type === '(') {
      position += 1;
      const value = parseExpression();
      if (current()?.type !== ')') {
        throw new ExpressionError('unfinished', 'Unfinished');
      }
      position += 1;
      return value;
    }

    if (token.type === ')') {
      throw new ExpressionError('invalid', 'Invalid expression');
    }

    throw new ExpressionError('invalid', 'Invalid expression');
  }

  const value = parseExpression();
  if (position < tokens.length) {
    throw new ExpressionError('invalid', 'Invalid expression');
  }
  return value;
}

export function formatValue(value) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

function evaluateInternal(expression, rows, variables, stack) {
  if (!expression.trim()) return { state: 'empty' };

  try {
    const tokens = tokenize(expression);
    const value = parseTokens(tokens, (lineNumber) => {
      if (!Number.isInteger(lineNumber) || lineNumber < 1 || lineNumber > 10) {
        throw new ExpressionError('invalid', 'Invalid expression');
      }
      const index = lineNumber - 1;
      if (stack.includes(index)) {
        throw new ExpressionError('circular', 'Circular reference');
      }
      const rowResult = evaluateRow(index, rows, variables, [...stack]);
      if (rowResult.state === 'result') return rowResult.value;
      if (rowResult.state === 'circular') {
        throw new ExpressionError('circular', 'Circular reference');
      }
      throw new ExpressionError('waiting', `Waiting for line ${lineNumber}`, lineNumber);
    }, (name) => {
      const value = variables?.[name];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ExpressionError('waiting', `Waiting for variable ${name}`);
      }
      return value;
    });
    return { state: 'result', value, display: formatValue(value) };
  } catch (error) {
    if (error instanceof ExpressionError) {
      const result = { state: error.state, message: error.message };
      if (error.line !== undefined) result.line = error.line;
      return result;
    }
    throw error;
  }
}

function evaluateRow(index, rows, variables, stack) {
  const expression = rows[index] ?? '';
  if (!expression.trim()) return { state: 'empty' };
  return evaluateInternal(expression, rows, variables, [...stack, index]);
}

export function evaluateExpression(expression, rows = [], variables = {}) {
  return evaluateInternal(expression, rows, variables, []);
}

export function evaluateRows(rows, variables = {}) {
  return Array.from({ length: 10 }, (_, index) => evaluateRow(index, rows, variables, []));
}

export function calculateTotal(results) {
  const validResults = results.filter((result) => result.state === 'result');
  const value = validResults.reduce((total, result) => total + result.value, 0);
  return {
    value,
    display: validResults.length ? formatValue(value) : '—',
    validCount: validResults.length,
    excludedCount: results.length - validResults.length
  };
}
