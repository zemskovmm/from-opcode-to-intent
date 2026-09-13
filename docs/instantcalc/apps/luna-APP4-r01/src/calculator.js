const OPERATOR_TOKENS = new Set(['+', '-', '*', '×', '/', '÷', '^', '(', ')']);

function parseIssue(status) {
  return { status };
}

function tokenize(source) {
  const tokens = [];
  let position = 0;

  while (position < source.length) {
    const character = source[position];
    if (/\s/.test(character)) {
      position += 1;
      continue;
    }

    if (/[0-9]/.test(character)) {
      const start = position;
      while (/[0-9]/.test(source[position] || '')) position += 1;
      if (source[position] === '.') {
        position += 1;
        const fractionStart = position;
        while (/[0-9]/.test(source[position] || '')) position += 1;
        if (position === fractionStart) throw parseIssue('Error');
      }
      const value = Number(source.slice(start, position));
      if (!Number.isFinite(value)) throw parseIssue('Error');
      tokens.push({ type: 'number', value });
      continue;
    }

    if (character === '.') throw parseIssue('Error');

    if (character === '$') {
      position += 1;
      const start = position;
      while (/[0-9]/.test(source[position] || '')) position += 1;
      if (position === start) {
        throw parseIssue(position === source.length ? 'Incomplete' : 'Error');
      }
      const digits = source.slice(start, position);
      const rowNumber = Number(digits);
      if (!/^(?:[1-9]|10)$/.test(digits) || rowNumber < 1 || rowNumber > 10) {
        throw parseIssue('Error');
      }
      tokens.push({ type: 'reference', value: rowNumber - 1 });
      continue;
    }

    if (character === '@') {
      position += 1;
      if (!/[A-Za-z]/.test(source[position] || '')) {
        throw parseIssue(position === source.length ? 'Incomplete' : 'Error');
      }
      const start = position;
      while (/[A-Za-z0-9_]/.test(source[position] || '')) position += 1;
      tokens.push({ type: 'variable', value: source.slice(start, position) });
      continue;
    }

    if (OPERATOR_TOKENS.has(character)) {
      tokens.push({ type: character });
      position += 1;
      continue;
    }

    throw parseIssue('Error');
  }

  return tokens;
}

function parse(source) {
  const tokens = tokenize(source);
  if (tokens.length === 0) throw parseIssue('Incomplete');
  let cursor = 0;

  const current = () => tokens[cursor];
  const consume = (type) => {
    if (current()?.type !== type) return false;
    cursor += 1;
    return true;
  };

  function primary() {
    const token = current();
    if (!token) throw parseIssue('Incomplete');
    if (token.type === 'number') {
      cursor += 1;
      return { type: 'number', value: token.value };
    }
    if (token.type === 'reference') {
      cursor += 1;
      return { type: 'reference', row: token.value };
    }
    if (token.type === 'variable') {
      cursor += 1;
      return { type: 'variable', name: token.value };
    }
    if (consume('(')) {
      const value = addition();
      if (!consume(')')) throw parseIssue('Incomplete');
      return value;
    }
    throw parseIssue('Error');
  }

  function power() {
    const left = primary();
    if (!consume('^')) return left;
    return { type: 'binary', operator: '^', left, right: unary() };
  }

  function unary() {
    if (consume('-')) return { type: 'unary', operator: '-', value: unary() };
    return power();
  }

  function multiplication() {
    let left = unary();
    while (current() && (current().type === '*' || current().type === '×' || current().type === '/' || current().type === '÷')) {
      const operator = current().type;
      cursor += 1;
      const right = unary();
      left = { type: 'binary', operator, left, right };
    }
    return left;
  }

  function addition() {
    let left = multiplication();
    while (current() && (current().type === '+' || current().type === '-')) {
      const operator = current().type;
      cursor += 1;
      const right = multiplication();
      left = { type: 'binary', operator, left, right };
    }
    return left;
  }

  const tree = addition();
  if (cursor !== tokens.length) throw parseIssue('Error');
  return tree;
}

function statusResult(status) {
  return { kind: 'status', status };
}

function combineStatuses(left, right) {
  const rank = { Unresolved: 1, 'Circular reference': 2, Error: 3 };
  return rank[left.status] >= rank[right.status] ? left : right;
}

function evaluateTree(tree, getRow, getVariable) {
  if (tree.type === 'number') return { kind: 'value', value: tree.value };
  if (tree.type === 'reference') return getRow(tree.row);
  if (tree.type === 'variable') return getVariable(tree.name);
  if (tree.type === 'unary') {
    const value = evaluateTree(tree.value, getRow, getVariable);
    return value.kind === 'status' ? value : { kind: 'value', value: -value.value };
  }

  const left = evaluateTree(tree.left, getRow, getVariable);
  const right = evaluateTree(tree.right, getRow, getVariable);
  if (left.kind === 'status' && right.kind === 'status') return combineStatuses(left, right);
  if (left.kind === 'status') return left;
  if (right.kind === 'status') return right;

  let value;
  switch (tree.operator) {
    case '+': value = left.value + right.value; break;
    case '-': value = left.value - right.value; break;
    case '*':
    case '×': value = left.value * right.value; break;
    case '/':
    case '÷':
      if (right.value === 0) return statusResult('Error');
      value = left.value / right.value;
      break;
    case '^': value = left.value ** right.value; break;
    default: return statusResult('Error');
  }
  return Number.isFinite(value) ? { kind: 'value', value } : statusResult('Error');
}

function expandExponent(value) {
  const text = String(value);
  if (!/[eE]/.test(text)) return text;
  const [mantissa, exponentText] = text.toLowerCase().split('e');
  const exponent = Number(exponentText);
  const negative = mantissa.startsWith('-');
  const digits = mantissa.replace('-', '').replace('.', '');
  const decimalPosition = (mantissa.includes('.') ? mantissa.indexOf('.') : mantissa.length) + exponent;
  let expanded;
  if (decimalPosition <= 0) expanded = `0.${'0'.repeat(-decimalPosition)}${digits}`;
  else if (decimalPosition >= digits.length) expanded = `${digits}${'0'.repeat(decimalPosition - digits.length)}`;
  else expanded = `${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`;
  return negative ? `-${expanded}` : expanded;
}

export function formatValue(value) {
  if (!Number.isFinite(value)) return '';
  if (Object.is(value, -0) || value === 0) return '0';
  if (Number.isInteger(value)) return expandExponent(value);
  return expandExponent(Number(value.toFixed(2)) === 0 ? '0.00' : value.toFixed(2));
}

export function buildVariableMap(variableRows = []) {
  const variables = Object.create(null);
  const validName = /^[A-Za-z][A-Za-z0-9_]*$/;
  const validValue = /^-?(?:\d+|\d+\.\d+)$/;
  variableRows.forEach((row) => {
    const name = String(row?.name ?? '').trim();
    if (!name || !validName.test(name)) return;
    if (Object.prototype.hasOwnProperty.call(variables, name)) {
      variables[name] = null;
      return;
    }
    const value = String(row?.value ?? '').trim();
    const number = validValue.test(value) ? Number(value) : NaN;
    variables[name] = Number.isFinite(number) ? number : null;
  });
  return variables;
}

export function evaluateWorkspace(expressions, variables = {}) {
  const rows = Array.from({ length: 10 }, (_, index) => String(expressions[index] ?? ''));
  const parsed = rows.map((expression) => {
    if (expression.trim() === '') return { tree: null, status: '' };
    try {
      return { tree: parse(expression), status: '' };
    } catch (issue) {
      return { tree: null, status: issue.status || 'Error' };
    }
  });
  const state = Array(10).fill(0);
  const memo = Array(10);

  function evaluateRow(index) {
    if (memo[index]) return memo[index];
    if (state[index] === 1) return statusResult('Circular reference');
    if (parsed[index].status) {
      memo[index] = statusResult(parsed[index].status);
      return memo[index];
    }
    if (!parsed[index].tree) {
      memo[index] = statusResult('Unresolved');
      return memo[index];
    }

    state[index] = 1;
    const result = evaluateTree(parsed[index].tree, (row) => {
      const dependency = evaluateRow(row);
      if (dependency.kind === 'value') return dependency;
      if (dependency.status === 'Circular reference') return dependency;
      return statusResult('Unresolved');
    }, (name) => {
      const value = variables[name];
      return typeof value === 'number' && Number.isFinite(value)
        ? { kind: 'value', value }
        : statusResult('Unresolved');
    });
    state[index] = 2;
    memo[index] = result;
    return result;
  }

  return rows.map((_, index) => {
    if (rows[index].trim() === '') return { value: null, display: '', status: '' };
    const result = evaluateRow(index);
    if (result.kind === 'value') return { value: result.value, display: formatValue(result.value), status: '' };
    return { value: null, display: '', status: result.status };
  });
}

export function calculateTotal(results) {
  let value = 0;
  let excluded = 0;
  results.forEach((result) => {
    if (result.status || result.value === null || !Number.isFinite(result.value)) {
      excluded += 1;
      return;
    }
    value += result.value;
  });
  if (!Number.isFinite(value)) return { value: null, display: '', excluded, status: 'Error' };
  return { value, display: formatValue(value), excluded, status: '' };
}

export { parse };
