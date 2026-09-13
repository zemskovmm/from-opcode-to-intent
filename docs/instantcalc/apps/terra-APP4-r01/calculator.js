const INCOMPLETE = Symbol('incomplete');

class ParseError extends Error {
  constructor(incomplete = false) {
    super(incomplete ? 'Incomplete expression' : 'Invalid expression');
    this.incomplete = incomplete;
  }
}

function normalize(expression) {
  return String(expression ?? '')
    .replace(/\s/g, '')
    .replaceAll('*', '×')
    .replaceAll('/', '÷')
    .replaceAll('-', '−');
}

class Parser {
  constructor(expression) {
    this.text = expression;
    this.at = 0;
  }

  peek() { return this.text[this.at]; }
  take(character) {
    if (this.peek() === character) {
      this.at += 1;
      return true;
    }
    return false;
  }

  parse() {
    const node = this.sum();
    if (this.at !== this.text.length) throw new ParseError();
    return node;
  }

  sum() {
    let node = this.product();
    while (this.peek() === '+' || this.peek() === '−') {
      const operator = this.text[this.at++];
      node = { type: 'binary', operator, left: node, right: this.product() };
    }
    return node;
  }

  product() {
    let node = this.unary();
    while (this.peek() === '×' || this.peek() === '÷') {
      const operator = this.text[this.at++];
      node = { type: 'binary', operator, left: node, right: this.unary() };
    }
    return node;
  }

  unary() {
    if (this.take('−')) return { type: 'negative', value: this.unary() };
    return this.power();
  }

  power() {
    let node = this.primary();
    if (this.take('^')) node = { type: 'binary', operator: '^', left: node, right: this.unary() };
    return node;
  }

  primary() {
    if (this.take('(')) {
      const node = this.sum();
      if (!this.take(')')) throw new ParseError(this.at === this.text.length);
      return node;
    }
    if (this.take('$')) {
      const start = this.at;
      while (/\d/.test(this.peek() ?? '')) this.at += 1;
      if (start === this.at) throw new ParseError(this.at === this.text.length);
      return { type: 'reference', number: Number(this.text.slice(start, this.at)) };
    }
    const remaining = this.text.slice(this.at);
    if (remaining === '.') throw new ParseError(true);
    const number = remaining.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (number) {
      this.at += number[0].length;
      return { type: 'number', value: Number(number[0]) };
    }
    throw new ParseError(this.at === this.text.length);
  }
}

function finite(value) {
  if (!Number.isFinite(value)) throw new ParseError();
  return value;
}

function resolve(node, rowNumber, rows) {
  if (node.type === 'number') return node.value;
  if (node.type === 'reference') {
    if (!Number.isInteger(node.number) || node.number < 1 || node.number >= rowNumber || node.number > 10) {
      throw new ParseError();
    }
    const source = rows[node.number - 1];
    if (!source || source.status !== 'value') return { needs: node.number };
    return source.value;
  }
  if (node.type === 'negative') {
    const value = resolve(node.value, rowNumber, rows);
    return value?.needs ? value : finite(-value);
  }
  const left = resolve(node.left, rowNumber, rows);
  if (left?.needs) return left;
  const right = resolve(node.right, rowNumber, rows);
  if (right?.needs) return right;
  if (node.operator === '+') return finite(left + right);
  if (node.operator === '−') return finite(left - right);
  if (node.operator === '×') return finite(left * right);
  if (node.operator === '÷') {
    if (right === 0) throw new ParseError();
    return finite(left / right);
  }
  return finite(left ** right);
}

export function evaluateExpression(expression, rowNumber, rows = []) {
  const text = normalize(expression);
  if (!text) return { status: 'blank' };
  try {
    const value = resolve(new Parser(text).parse(), rowNumber, rows);
    if (value?.needs) return { status: 'needs', reference: value.needs };
    return { status: 'value', value: Object.is(value, -0) ? 0 : value };
  } catch (error) {
    if (!(error instanceof ParseError)) throw error;
    return { status: error.incomplete ? 'incomplete' : 'invalid' };
  }
}

export function evaluateRows(expressions) {
  const rows = [];
  for (let index = 0; index < 10; index += 1) {
    rows.push(evaluateExpression(expressions[index] ?? '', index + 1, rows));
  }
  return rows;
}

export function formatResult(value) {
  const normalized = Object.is(value, -0) ? 0 : value;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(2);
}

export function insertAtSelection(text, start, end, token) {
  return `${text.slice(0, start)}${token}${text.slice(end)}`;
}
