class CalculationError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function tokenize(source) {
  const tokens = [];
  let index = 0;
  const input = source.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-');

  while (index < input.length) {
    const rest = input.slice(index);
    if (/^\s/.test(rest)) {
      index += 1;
    } else if (/^(?:\d+(?:\.\d*)?|\.\d+)/.test(rest)) {
      const text = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)/)[0];
      tokens.push({ type: 'number', value: Number(text) });
      index += text.length;
    } else if (/^\$\d+/.test(rest)) {
      const text = rest.match(/^\$\d+/)[0];
      tokens.push({ type: 'reference', value: Number(text.slice(1)) });
      index += text.length;
    } else if (/^sqrt\b/i.test(rest)) {
      tokens.push({ type: 'sqrt' });
      index += 4;
    } else if (rest[0] === '√') {
      tokens.push({ type: 'sqrt' });
      index += 1;
    } else if (/^[A-Za-z_][A-Za-z0-9_]*/.test(rest)) {
      const text = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/)[0];
      tokens.push({ type: 'variable', value: text });
      index += text.length;
    } else if ('+-*/^%()'.includes(rest[0])) {
      tokens.push({ type: rest[0] });
      index += 1;
    } else {
      throw new CalculationError('error', 'Check expression');
    }
  }
  tokens.push({ type: 'end' });
  return tokens;
}

function parser(tokens, resolveReference, resolveVariable) {
  let cursor = 0;
  const peek = () => tokens[cursor];
  const take = () => tokens[cursor++];
  const expect = (type) => {
    if (peek().type === type) return take();
    if (peek().type === 'end') throw new CalculationError('incomplete', 'Continue expression');
    throw new CalculationError('error', 'Check expression');
  };

  function primary() {
    const token = take();
    let value;
    if (token.type === 'number') {
      value = token.value;
    } else if (token.type === 'reference') {
      value = resolveReference(token.value);
    } else if (token.type === 'variable') {
      value = resolveVariable(token.value);
    } else if (token.type === '(') {
      value = expression(0);
      if (peek().type !== ')') {
        if (peek().type === 'end') throw new CalculationError('incomplete', 'Close parenthesis');
        throw new CalculationError('error', 'Check expression');
      }
      take();
    } else if (token.type === 'sqrt') {
      const hasParentheses = peek().type === '(';
      if (hasParentheses) take();
      value = Math.sqrt(primary());
      if (hasParentheses) expect(')');
    } else if (token.type === '+' || token.type === '-') {
      value = primary() * (token.type === '-' ? -1 : 1);
    } else if (token.type === 'end') {
      throw new CalculationError('incomplete', 'Continue expression');
    } else {
      throw new CalculationError('error', 'Check expression');
    }
    while (peek().type === '%') {
      take();
      value /= 100;
    }
    return value;
  }

  function expression(minimumPrecedence) {
    let left = primary();
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
    while (precedence[peek().type] >= minimumPrecedence) {
      const operator = take().type;
      const level = precedence[operator];
      const right = expression(operator === '^' ? level : level + 1);
      if (operator === '+') left += right;
      if (operator === '-') left -= right;
      if (operator === '*') left *= right;
      if (operator === '/') {
        if (right === 0) throw new CalculationError('error', 'Can’t divide by zero');
        left /= right;
      }
      if (operator === '^') left **= right;
    }
    return left;
  }

  const value = expression(0);
  if (peek().type !== 'end') throw new CalculationError('error', 'Check expression');
  if (!Number.isFinite(value)) throw new CalculationError('error', 'Result is too large');
  return value;
}

export function evaluateExpression(source, resolveReference = () => {
  throw new CalculationError('waiting', 'Waiting for referenced line');
}, resolveVariable = (name) => {
  throw new CalculationError('error', `Unknown variable: ${name}`);
}) {
  if (!source.trim()) return { status: 'empty' };
  try {
    return { status: 'ok', value: parser(tokenize(source), resolveReference, resolveVariable) };
  } catch (error) {
    if (error instanceof CalculationError) return { status: error.status, message: error.message };
    return { status: 'error', message: 'Check expression' };
  }
}

export function calculateRows(expressions, variables = {}) {
  const results = [];
  expressions.forEach((source, index) => {
    results.push(evaluateExpression(
      source,
      (line) => {
        const referenced = results[line - 1];
        if (line > index || !referenced || referenced.status !== 'ok') {
          throw new CalculationError('waiting', `Waiting for line ${line}`);
        }
        return referenced.value;
      },
      (name) => {
        if (!Object.hasOwn(variables, name)) {
          throw new CalculationError('error', `Unknown variable: ${name}`);
        }
        return variables[name];
      },
    ));
  });
  return results;
}

export function calculateTotal(results) {
  const valid = results.filter((result) => result.status === 'ok');
  return {
    value: valid.reduce((sum, result) => sum + result.value, 0),
    included: valid.length,
    excluded: results.length - valid.length,
  };
}

export function formatResult(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
