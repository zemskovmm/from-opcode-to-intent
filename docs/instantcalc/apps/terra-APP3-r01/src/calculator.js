class ParseError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

class Parser {
  constructor(source) {
    this.source = source;
    this.position = 0;
  }

  parse() {
    this.skipSpaces();
    if (this.atEnd()) return null;
    const expression = this.parseSum();
    this.skipSpaces();
    if (!this.atEnd()) throw new ParseError('invalid', 'Unexpected input');
    return expression;
  }

  parseSum() {
    let node = this.parseProduct();
    while (true) {
      this.skipSpaces();
      const operator = this.peek();
      if (operator !== '+' && operator !== '-') return node;
      this.position += 1;
      node = { type: 'binary', operator, left: node, right: this.parseProduct() };
    }
  }

  parseProduct() {
    let node = this.parseUnary();
    while (true) {
      this.skipSpaces();
      const operator = this.peek();
      if (operator !== '*' && operator !== '/') return node;
      this.position += 1;
      node = { type: 'binary', operator, left: node, right: this.parseUnary() };
    }
  }

  parseUnary() {
    this.skipSpaces();
    const operator = this.peek();
    if (operator === '+' || operator === '-') {
      this.position += 1;
      return { type: 'unary', operator, value: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    this.skipSpaces();
    if (this.atEnd()) throw new ParseError('incomplete');
    const character = this.peek();
    if (character === '(') {
      this.position += 1;
      const value = this.parseSum();
      this.skipSpaces();
      if (this.peek() !== ')') {
        if (this.atEnd()) throw new ParseError('incomplete');
        throw new ParseError('invalid', 'Expected a closing parenthesis');
      }
      this.position += 1;
      return value;
    }
    if (character === '$') return this.parseReference();
    if (character === '@') return this.parseVariable();
    if (character === '.' || this.isDigit(character)) return this.parseNumber();
    if (character === ')') throw new ParseError('invalid', 'Unexpected closing parenthesis');
    throw new ParseError('invalid', 'Unexpected input');
  }

  parseReference() {
    this.position += 1;
    const start = this.position;
    while (this.isDigit(this.peek())) this.position += 1;
    if (start === this.position) throw new ParseError('incomplete');
    return { type: 'reference', line: Number(this.source.slice(start, this.position)) };
  }

  parseVariable() {
    this.position += 1;
    const start = this.position;
    if (!this.isNameStart(this.peek())) {
      if (this.atEnd()) throw new ParseError('incomplete');
      throw new ParseError('invalid', 'Invalid variable name');
    }
    this.position += 1;
    while (this.isNamePart(this.peek())) this.position += 1;
    return { type: 'variable', name: this.source.slice(start, this.position) };
  }

  parseNumber() {
    const start = this.position;
    let digits = 0;
    while (this.isDigit(this.peek())) {
      this.position += 1;
      digits += 1;
    }
    if (this.peek() === '.') {
      this.position += 1;
      while (this.isDigit(this.peek())) {
        this.position += 1;
        digits += 1;
      }
    }
    if (digits === 0) throw new ParseError('incomplete');
    return { type: 'number', value: Number(this.source.slice(start, this.position)) };
  }

  skipSpaces() {
    while (/\s/.test(this.peek())) this.position += 1;
  }

  peek() {
    return this.source[this.position] ?? '';
  }

  atEnd() {
    return this.position >= this.source.length;
  }

  isDigit(character) {
    return character >= '0' && character <= '9';
  }

  isNameStart(character) {
    return /[A-Za-z_]/.test(character);
  }

  isNamePart(character) {
    return /[A-Za-z0-9_]/.test(character);
  }
}

function evaluateNode(node, values, variables) {
  if (node.type === 'number') return node.value;
  if (node.type === 'reference') {
    if (!Number.isInteger(node.line) || node.line < 1 || node.line > values.length) {
      throw new ParseError('invalid', 'References must point to an earlier line');
    }
    const value = values[node.line - 1];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new ParseError('waiting', String(node.line));
    }
    return value;
  }
  if (node.type === 'variable') {
    if (!Object.hasOwn(variables, node.name)) {
      throw new ParseError('invalid', `Unknown variable @${node.name}`);
    }
    const value = variables[node.name];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new ParseError('waiting-variable', node.name);
    }
    return value;
  }
  if (node.type === 'unary') {
    const value = evaluateNode(node.value, values, variables);
    return node.operator === '-' ? -value : value;
  }

  const left = evaluateNode(node.left, values, variables);
  const right = evaluateNode(node.right, values, variables);
  if (node.operator === '/' && right === 0) {
    throw new ParseError('invalid', 'Cannot divide by zero');
  }
  const value = node.operator === '+' ? left + right
    : node.operator === '-' ? left - right
      : node.operator === '*' ? left * right : left / right;
  if (!Number.isFinite(value)) throw new ParseError('invalid', 'Result is too large');
  return value;
}

export function evaluateExpression(source, earlierValues = [], variables = {}) {
  try {
    const ast = new Parser(source).parse();
    if (ast === null) return { kind: 'empty' };
    return { kind: 'value', value: evaluateNode(ast, earlierValues, variables) };
  } catch (error) {
    if (!(error instanceof ParseError)) throw error;
    if (error.kind === 'waiting') return { kind: 'waiting', line: Number(error.message) };
    if (error.kind === 'waiting-variable') return { kind: 'waitingVariable', name: error.message };
    if (error.kind === 'incomplete') return { kind: 'incomplete' };
    return { kind: 'invalid', message: error.message || 'Cannot calculate' };
  }
}

export function formatResult(value) {
  if (Object.is(value, -0) || value === 0) return '0';
  if (Number.isInteger(value)) return String(value);
  const formatted = value.toFixed(2);
  return formatted === '-0.00' ? '0.00' : formatted;
}
