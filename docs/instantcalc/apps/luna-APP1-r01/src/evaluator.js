class IncompleteExpression extends Error {}

class InvalidExpression extends Error {}

function tokenize(input) {
  const tokens = [];
  let position = 0;
  const source = input.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-');

  while (position < source.length) {
    const character = source[position];
    if (/\s/.test(character)) {
      position += 1;
      continue;
    }
    if (/[0-9.]/.test(character)) {
      const match = source.slice(position).match(/(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) throw new InvalidExpression();
      tokens.push({ type: 'number', value: Number(match[0]) });
      position += match[0].length;
      continue;
    }
    if (character === '$') {
      const match = source.slice(position + 1).match(/^\d+/);
      if (!match || Number(match[0]) < 1 || Number(match[0]) > 10) {
        throw new InvalidExpression();
      }
      tokens.push({ type: 'reference', value: Number(match[0]) });
      position += match[0].length + 1;
      continue;
    }
    if (character === '@') {
      const match = source.slice(position + 1).match(/^[A-Za-z][A-Za-z0-9_]*/);
      if (!match) {
        if (position + 1 === source.length) throw new IncompleteExpression();
        throw new InvalidExpression();
      }
      tokens.push({ type: 'variable', value: match[0] });
      position += match[0].length + 1;
      continue;
    }
    if ('+-*/()'.includes(character)) {
      tokens.push({ type: character, value: character });
      position += 1;
      continue;
    }
    throw new InvalidExpression();
  }
  return tokens;
}

export function evaluateExpression(input, lineResults = [], variables = {}) {
  if (!input.trim()) return { status: 'empty' };

  try {
    const tokens = tokenize(input);
    let cursor = 0;

    const peek = () => tokens[cursor];
    const take = (type) => {
      if (peek()?.type !== type) return false;
      cursor += 1;
      return true;
    };

    const parseExpression = () => {
      let value = parseTerm();
      while (peek()?.type === '+' || peek()?.type === '-') {
        const operator = tokens[cursor++].type;
        const right = parseTerm();
        value = operator === '+' ? value + right : value - right;
      }
      return value;
    };

    const parseTerm = () => {
      let value = parseFactor();
      while (peek()?.type === '*' || peek()?.type === '/') {
        const operator = tokens[cursor++].type;
        const right = parseFactor();
        if (operator === '/') {
          if (right === 0) throw new InvalidExpression();
          value /= right;
        } else {
          value *= right;
        }
      }
      return value;
    };

    const parseFactor = () => {
      if (take('+')) return parseFactor();
      if (take('-')) return -parseFactor();

      if (take('(')) {
        const value = parseExpression();
        if (!take(')')) throw new IncompleteExpression();
        return value;
      }

      const token = peek();
      if (!token) throw new IncompleteExpression();
      if (token.type === 'number') {
        cursor += 1;
        return token.value;
      }
      if (token.type === 'reference') {
        cursor += 1;
        const value = lineResults[token.value - 1];
        if (!Number.isFinite(value)) throw new IncompleteExpression();
        return value;
      }
      if (token.type === 'variable') {
        cursor += 1;
        const value = variables[token.value];
        if (!Number.isFinite(value)) throw new IncompleteExpression();
        return value;
      }
      throw new InvalidExpression();
    };

    const value = parseExpression();
    if (cursor < tokens.length) throw new InvalidExpression();
    if (!Number.isFinite(value)) throw new InvalidExpression();
    return { status: 'ok', value };
  } catch (error) {
    if (error instanceof IncompleteExpression) return { status: 'incomplete' };
    return { status: 'error' };
  }
}
