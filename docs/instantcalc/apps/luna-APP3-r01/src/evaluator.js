const INCOMPLETE = 'incomplete';
const INVALID = 'invalid';

class ParseError extends Error {
  constructor(kind) {
    super(kind);
    this.kind = kind;
  }
}

class UnavailableError extends Error {}

function tokenize(source) {
  const tokens = [];
  let position = 0;

  while (position < source.length) {
    const character = source[position];
    if (/\s/.test(character)) {
      position += 1;
      continue;
    }

    if ('()+-−*/×÷'.includes(character)) {
      tokens.push({ type: character === '×' ? '*' : character === '÷' ? '/' : character === '−' ? '-' : character });
      position += 1;
      continue;
    }

    if (character === '$') {
      const match = source.slice(position).match(/^\$(\d{1,2})/);
      if (!match) {
        throw new ParseError(position === source.length - 1 ? INCOMPLETE : INVALID);
      }
      tokens.push({ type: 'reference', index: Number(match[1]) - 1 });
      position += match[0].length;
      continue;
    }

    if (character === '@') {
      const match = source.slice(position).match(/^@([A-Za-z][A-Za-z0-9_]*)/);
      if (!match) {
        throw new ParseError(position === source.length - 1 ? INCOMPLETE : INVALID);
      }
      tokens.push({ type: 'variable', name: match[1].toLowerCase() });
      position += match[0].length;
      continue;
    }

    if (character === '.' || /\d/.test(character)) {
      const match = source.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) {
        throw new ParseError(INVALID);
      }
      const text = match[0];
      tokens.push({ type: 'number', value: Number(text), incomplete: text.endsWith('.') });
      position += text.length;
      continue;
    }

    throw new ParseError(INVALID);
  }

  return tokens;
}

class Parser {
  constructor(tokens, resolveReference, resolveVariable = () => 0) {
    this.tokens = tokens;
    this.position = 0;
    this.resolveReference = resolveReference;
    this.resolveVariable = resolveVariable;
  }

  current() {
    return this.tokens[this.position];
  }

  take(type) {
    if (this.current()?.type !== type) return false;
    this.position += 1;
    return true;
  }

  parse() {
    if (!this.tokens.length) throw new ParseError(INCOMPLETE);
    const value = this.expression();
    if (this.current()) throw new ParseError(this.current().type === ')' ? INVALID : INVALID);
    return value;
  }

  expression() {
    let value = this.term();
    while (this.current()?.type === '+' || this.current()?.type === '-') {
      const operator = this.current().type;
      this.position += 1;
      value = operator === '+' ? value + this.term() : value - this.term();
    }
    return value;
  }

  term() {
    let value = this.unary();
    while (this.current()?.type === '*' || this.current()?.type === '/') {
      const operator = this.current().type;
      this.position += 1;
      const right = this.unary();
      if (operator === '/' && right === 0) throw new UnavailableError('division by zero');
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  }

  unary() {
    if (this.take('-')) return -this.unary();
    return this.primary();
  }

  primary() {
    const token = this.current();
    if (!token) throw new ParseError(INCOMPLETE);
    if (token.type === 'number') {
      this.position += 1;
      if (token.incomplete) throw new ParseError(INCOMPLETE);
      return token.value;
    }
    if (token.type === 'reference') {
      this.position += 1;
      if (token.index < 0 || token.index > 9) throw new UnavailableError('row unavailable');
      return this.resolveReference(token.index);
    }
    if (token.type === 'variable') {
      this.position += 1;
      return this.resolveVariable(token.name);
    }
    if (this.take('(')) {
      const value = this.expression();
      if (!this.take(')')) throw new ParseError(INCOMPLETE);
      return value;
    }
    throw new ParseError(token.type === ')' ? INVALID : INVALID);
  }
}

export function roundToCents(value) {
  const rounded = Math.round((value + Math.sign(value) * Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function formatResult(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  const rounded = roundToCents(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export function getEvaluationState(expression) {
  if (!expression.trim()) return { state: 'empty', value: null };
  try {
    const value = new Parser(tokenize(expression), () => 0).parse();
    return { state: 'complete', value: roundToCents(value) };
  } catch (error) {
    if (error instanceof ParseError) return { state: error.kind, value: null };
    return { state: 'unavailable', value: null };
  }
}

export function evaluateRows(expressions, variables = {}) {
  const results = expressions.map(() => null);
  const visiting = new Set();

  function visit(index) {
    if (results[index]) return results[index];
    const expression = expressions[index] ?? '';
    if (!expression.trim()) {
      results[index] = { state: 'empty', value: null };
      return results[index];
    }
    if (visiting.has(index)) throw new UnavailableError('circular reference');

    visiting.add(index);
    try {
      const value = new Parser(
        tokenize(expression),
        (referenceIndex) => {
          const referenced = results[referenceIndex] ?? visit(referenceIndex);
          if (!referenced || referenced.state !== 'complete') throw new UnavailableError('row unavailable');
          return referenced.value;
        },
        (name) => {
          if (!Object.hasOwn(variables, name) || !Number.isFinite(Number(variables[name]))) {
            throw new UnavailableError('variable unavailable');
          }
          return Number(variables[name]);
        },
      ).parse();
      results[index] = { state: 'complete', value: roundToCents(value) };
    } catch (error) {
      if (error instanceof ParseError) {
        results[index] = { state: error.kind, value: null };
      } else {
        results[index] = { state: 'unavailable', value: null };
      }
    } finally {
      visiting.delete(index);
    }
    return results[index];
  }

  expressions.forEach((_, index) => visit(index));
  return results;
}

export function calculateTotal(results) {
  const validValues = results.filter((result) => result?.state === 'complete').map((result) => result.value);
  return {
    value: roundToCents(validValues.reduce((sum, value) => sum + value, 0)),
    validCount: validValues.length,
    excludedCount: results.length - validValues.length,
  };
}
