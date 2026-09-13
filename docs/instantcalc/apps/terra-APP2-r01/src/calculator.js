const STATUS = {
  incomplete: 'incomplete',
  invalid: 'invalid',
  waiting: 'waiting',
  circular: 'circular',
  undefined: 'undefined',
  'no-real-result': 'no-real-result',
  'out-of-range': 'out-of-range'
};

function issue(state, extra = {}) {
  throw { state, ...extra };
}

function tokenize(text) {
  const tokens = [];
  let at = 0;
  while (at < text.length) {
    const char = text[at];
    if (/\s/.test(char)) { at++; continue; }
    const number = text.slice(at).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (number) {
      tokens.push({ type: 'number', value: Number(number[0]) });
      at += number[0].length;
      continue;
    }
    if (char === '$') {
      const match = text.slice(at).match(/^\$(\d+)/);
      if (!match) issue('incomplete');
      tokens.push({ type: 'reference', value: Number(match[1]) });
      at += match[0].length;
      continue;
    }
    if (char === '@') {
      const match = text.slice(at).match(/^@([A-Za-z_][A-Za-z0-9_]*)/);
      if (!match) issue(at === text.length - 1 ? 'incomplete' : 'invalid');
      tokens.push({ type: 'variable', value: match[1] });
      at += match[0].length;
      continue;
    }
    if ('+-*/^'.includes(char)) {
      tokens.push({ type: 'operator', value: char }); at++; continue;
    }
    if (char === '×') { tokens.push({ type: 'operator', value: '*' }); at++; continue; }
    if (char === '÷') { tokens.push({ type: 'operator', value: '/' }); at++; continue; }
    if (char === '√') { tokens.push({ type: 'root' }); at++; continue; }
    if (char === '%') { tokens.push({ type: 'percent' }); at++; continue; }
    if (char === '(' || char === ')') { tokens.push({ type: char }); at++; continue; }
    if (char === 'π') { tokens.push({ type: 'constant', value: Math.PI }); at++; continue; }
    if (char === 'e') { tokens.push({ type: 'constant', value: Math.E }); at++; continue; }
    issue('invalid');
  }
  return tokens;
}

function findCircularRows(rows) {
  const graph = rows.map((text) => [...text.matchAll(/\$(\d+)/g)]
    .map((match) => Number(match[1]) - 1)
    .filter((index) => index >= 0 && index < rows.length));
  const visited = new Set();
  const path = [];
  const circular = new Set();
  function visit(node) {
    const seenAt = path.indexOf(node);
    if (seenAt !== -1) {
      path.slice(seenAt).forEach((row) => circular.add(row));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    path.push(node);
    graph[node].forEach(visit);
    path.pop();
  }
  rows.forEach((_, index) => visit(index));
  return circular;
}

function finite(value) {
  if (!Number.isFinite(value)) issue('out-of-range');
  return value;
}

function evaluateExpression(text, getReference, getVariable) {
  const tokens = tokenize(text);
  let at = 0;
  const peek = () => tokens[at];
  const take = () => tokens[at++];

  function prefix() {
    const token = take();
    if (!token) issue('incomplete');
    if (token.type === 'number' || token.type === 'constant') return finite(token.value);
    if (token.type === 'reference') return getReference(token.value);
    if (token.type === 'variable') return getVariable(token.value);
    if (token.type === 'operator' && (token.value === '+' || token.value === '-')) {
      const value = expression(3);
      return token.value === '-' ? finite(-value) : value;
    }
    if (token.type === 'root') {
      if (!peek()) issue('incomplete');
      if (take().type !== '(') issue('invalid');
      const value = expression(0);
      if (!peek()) issue('incomplete');
      if (take().type !== ')') issue('invalid');
      if (value < 0) issue('no-real-result');
      return finite(Math.sqrt(value));
    }
    if (token.type === '(') {
      const value = expression(0);
      if (!peek()) issue('incomplete');
      if (take().type !== ')') issue('invalid');
      return value;
    }
    issue('invalid');
  }

  function expression(minPrecedence) {
    let value = prefix();
    while (true) {
      const token = peek();
      if (token?.type === 'percent') {
        take();
        value = finite(value / 100);
        continue;
      }
      if (token?.type !== 'operator') break;
      const precedence = token.value === '^' ? 3 : '*/'.includes(token.value) ? 2 : 1;
      if (precedence < minPrecedence) break;
      take();
      const right = expression(token.value === '^' ? precedence : precedence + 1);
      if (token.value === '+') value = finite(value + right);
      if (token.value === '-') value = finite(value - right);
      if (token.value === '*') value = finite(value * right);
      if (token.value === '/') {
        if (right === 0) issue('undefined');
        value = finite(value / right);
      }
      if (token.value === '^') value = finite(value ** right);
    }
    return value;
  }

  const value = expression(0);
  if (peek()) issue('invalid');
  return value;
}

export function calculateRows(expressions, variables = {}) {
  const rows = expressions.map((expression) => ({ expression, state: null }));
  const circular = findCircularRows(expressions);
  const resolve = (index) => {
    const row = rows[index];
    if (row.state) return row;
    if (!row.expression.trim()) return { state: 'blank' };
    if (circular.has(index)) return { state: 'circular' };
    try {
      const value = evaluateExpression(row.expression, (reference) => {
        const referenceIndex = reference - 1;
        if (referenceIndex < 0 || referenceIndex >= rows.length) issue('invalid');
        const dependency = resolve(referenceIndex);
        if (dependency.state !== 'result') issue('waiting', { waitingFor: reference });
        return dependency.value;
      }, (variable) => {
        if (!Object.hasOwn(variables, variable) || !Number.isFinite(variables[variable])) issue('invalid');
        return variables[variable];
      });
      row.state = 'result';
      row.value = value;
    } catch (error) {
      row.state = STATUS[error.state] || 'invalid';
      if (error.waitingFor) row.waitingFor = error.waitingFor;
    }
    return row;
  };
  return rows.map((_, index) => resolve(index));
}

export function formatResult(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function calculateTotal(rows) {
  const validRows = rows.filter((row) => row.state === 'result');
  return {
    value: validRows.reduce((total, row) => total + row.value, 0),
    excluded: rows.length - validRows.length
  };
}
