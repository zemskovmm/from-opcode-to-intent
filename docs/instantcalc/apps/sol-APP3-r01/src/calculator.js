class CalculationError extends Error {
  constructor(type, detail) {
    super(type);
    this.type = type;
    this.detail = detail;
  }
}

function tokenize(expression) {
  const tokens = [];
  let offset = 0;

  while (offset < expression.length) {
    const rest = expression.slice(offset);
    const whitespace = rest.match(/^\s+/);
    if (whitespace) {
      offset += whitespace[0].length;
      continue;
    }

    const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (number) {
      tokens.push({ type: 'number', value: Number(number[0]) });
      offset += number[0].length;
      continue;
    }

    if (rest[0] === '$') {
      const reference = rest.match(/^\$(\d+)/);
      if (!reference) {
        throw new CalculationError(rest.length === 1 ? 'incomplete' : 'invalid');
      }
      tokens.push({ type: 'reference', value: Number(reference[1]) });
      offset += reference[0].length;
      continue;
    }

    if (rest[0] === '@') {
      const variable = rest.match(/^@([A-Za-z][A-Za-z0-9_]*)/);
      if (!variable) {
        throw new CalculationError(rest.length === 1 ? 'incomplete' : 'invalid');
      }
      tokens.push({ type: 'variable', value: variable[1] });
      offset += variable[0].length;
      continue;
    }

    const type = { '×': '*', '÷': '/', '+': '+', '-': '-', '−': '-', '*': '*', '/': '/', '(': '(', ')': ')', '%': '%' }[rest[0]];
    if (type) {
      tokens.push({ type });
      offset += 1;
      continue;
    }

    throw new CalculationError('invalid');
  }

  tokens.push({ type: 'end' });
  return tokens;
}

class Parser {
  constructor(tokens, rowIndex, evaluatedRows, variables) {
    this.tokens = tokens;
    this.rowIndex = rowIndex;
    this.evaluatedRows = evaluatedRows;
    this.variables = variables;
    this.position = 0;
  }

  current() {
    return this.tokens[this.position];
  }

  take(type) {
    if (this.current().type !== type) return false;
    this.position += 1;
    return true;
  }

  parse() {
    const value = this.additive();
    if (this.current().type !== 'end') throw new CalculationError('invalid');
    if (!Number.isFinite(value)) throw new CalculationError('invalid');
    return value;
  }

  additive() {
    let value = this.multiplicative();
    while (this.current().type === '+' || this.current().type === '-') {
      const operator = this.current().type;
      this.position += 1;
      const right = this.multiplicative();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  multiplicative() {
    let value = this.unary();
    while (this.current().type === '*' || this.current().type === '/') {
      const operator = this.current().type;
      this.position += 1;
      const right = this.unary();
      if (operator === '/' && right === 0) throw new CalculationError('division');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  }

  unary() {
    if (this.take('+')) return this.unary();
    if (this.take('-')) return -this.unary();
    return this.percentage();
  }

  percentage() {
    let value = this.primary();
    while (this.take('%')) value /= 100;
    return value;
  }

  primary() {
    const token = this.current();

    if (token.type === 'end') throw new CalculationError('incomplete');

    if (token.type === 'number') {
      this.position += 1;
      return token.value;
    }

    if (token.type === 'reference') {
      this.position += 1;
      const lineNumber = token.value;
      if (lineNumber < 1 || lineNumber > 10) throw new CalculationError('invalid');
      if (lineNumber >= this.rowIndex + 1) throw new CalculationError('later-reference');

      const source = this.evaluatedRows[lineNumber - 1];
      if (!source || source.status !== 'value') {
        throw new CalculationError('waiting', lineNumber);
      }
      return source.value;
    }

    if (token.type === 'variable') {
      this.position += 1;
      const name = token.value.toLowerCase();
      if (!this.variables.has(name)) throw new CalculationError('unknown-variable', token.value);
      return this.variables.get(name);
    }

    if (this.take('(')) {
      const value = this.additive();
      if (!this.take(')')) {
        if (this.current().type === 'end') throw new CalculationError('incomplete');
        throw new CalculationError('invalid');
      }
      return value;
    }

    throw new CalculationError('invalid');
  }
}

export function formatResult(value) {
  if (Object.is(value, -0)) return '0';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function evaluateVariables(variables) {
  const values = new Map();
  const rows = variables.map((variable) => {
    const name = variable.name.trim();
    const rawValue = variable.value.trim();

    if (!name && !rawValue) return { status: 'blank', message: '', value: null };
    if (!name) return { status: 'error', message: 'Add a name', value: null };
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
      return { status: 'error', message: 'Use letters, numbers, or _', value: null };
    }

    const normalizedName = name.toLowerCase();
    if (values.has(normalizedName)) {
      return { status: 'error', message: 'Name already used', value: null };
    }
    if (!rawValue) return { status: 'incomplete', message: 'Add a value', value: null };
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(rawValue)) {
      return { status: 'error', message: 'Enter a number', value: null };
    }

    const value = Number(rawValue);
    if (!Number.isFinite(value)) return { status: 'error', message: 'Enter a number', value: null };
    values.set(normalizedName, value);
    return { status: 'value', message: '', value };
  });

  return { rows, values };
}

export function evaluateWorksheet(expressions, variables = new Map()) {
  const evaluatedRows = [];

  expressions.forEach((expression, rowIndex) => {
    if (!expression.trim()) {
      evaluatedRows.push({ status: 'blank', message: '', value: null, display: '' });
      return;
    }

    try {
      const value = new Parser(tokenize(expression), rowIndex, evaluatedRows, variables).parse();
      evaluatedRows.push({ status: 'value', message: '', value, display: formatResult(value) });
    } catch (error) {
      if (!(error instanceof CalculationError)) throw error;
      const states = {
        incomplete: { status: 'incomplete', message: 'Finish expression' },
        division: { status: 'error', message: 'Cannot divide by zero' },
        invalid: { status: 'error', message: 'Check expression' },
        'later-reference': { status: 'error', message: 'Use an earlier line' },
        waiting: { status: 'waiting', message: `Waiting for line ${error.detail}` },
        'unknown-variable': { status: 'waiting', message: `Unknown variable @${error.detail}` },
      };
      evaluatedRows.push({ ...states[error.type], value: null, display: '' });
    }
  });

  return evaluatedRows;
}

export function calculateTotal(evaluatedRows) {
  let value = 0;
  let included = 0;
  const blankLines = [];
  const invalidLines = [];

  evaluatedRows.forEach((row, index) => {
    if (row.status === 'value') {
      value += row.value;
      included += 1;
    } else if (row.status === 'blank') {
      blankLines.push(index + 1);
    } else {
      invalidLines.push(index + 1);
    }
  });

  return { value, display: formatResult(value), included, blankLines, invalidLines };
}
