const fail = (message, status = 'error') => { throw { status, message }; };
const abs = n => n < 0n ? -n : n;

export function totalResults(results) {
  const excluded = results.flatMap((result, index) => result.status === 'valid' ? [] : [index + 1]);
  const counts = { included: results.length - excluded.length, excluded };
  try {
    const value = results.filter(result => result.status === 'valid')
      .reduce((sum, result) => operate(sum, '+', result.value), fraction(0n));
    return { status: 'valid', value, ...counts };
  } catch (error) { return { status: 'error', message: error.message, ...counts }; }
}

export function evaluateVariables(variables) {
  const bindings = new Map();
  const counts = new Map();
  for (const { name } of variables) counts.set(name, (counts.get(name) || 0) + 1);
  const results = variables.map(({ name, value }) => {
    let result;
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,31}$/.test(name)) {
      result = { status: 'error', field: 'name', message: 'Use 1–32 letters, digits or underscores; start with a letter or underscore' };
    } else if (counts.get(name) > 1) {
      result = { status: 'error', field: 'name', message: `Duplicate variable: ${name}` };
    } else if (!/^[+\-−]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()) || value.length > 1000) {
      result = { status: 'error', field: 'value', message: `Enter a numeric value for ${name}` };
    } else {
      result = calculate(value);
    }
    bindings.set(name, result);
    return result;
  });
  return { bindings, results };
}

function fraction(n, d = 1n) {
  if (d === 0n) fail('Cannot divide by zero');
  if (n.toString().length > 4096 || d.toString().length > 4096) fail('This number is too large');
  if (d < 0n) { n = -n; d = -d; }
  let a = abs(n), b = d;
  while (b) [a, b] = [b, a % b];
  return { n: n / a, d: d / a };
}

function operate(a, op, b) {
  if (op === '+') return fraction(a.n * b.d + b.n * a.d, a.d * b.d);
  if (op === '-') return fraction(a.n * b.d - b.n * a.d, a.d * b.d);
  if (op === '*') return fraction(a.n * b.n, a.d * b.d);
  return fraction(a.n * b.d, a.d * b.n);
}

export function calculate(expression, previous = [], variables = new Map()) {
  if (!expression.trim()) return { status: 'empty' };
  try {
    if (expression.length > 1000) fail('Keep expressions under 1,000 characters');
    const source = expression.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-');
    const tokens = [];
    let offset = 0;
    while (offset < source.length) {
      if (/\s/.test(source[offset])) { offset++; continue; }
      const match = /^(?:\d+(?:\.\d*)?|\.\d+|\$\d+|[A-Za-z_][A-Za-z0-9_]*|[()+*/-])/.exec(source.slice(offset));
      if (!match) {
        if (/^[.$]\s*$/.test(source.slice(offset))) {
          tokens.push(source[offset]);
          break;
        }
        fail('Use numbers, variables, +, −, ×, ÷, parentheses or $ references');
      }
      tokens.push(match[0]);
      offset += match[0].length;
    }
    let position = 0;
    const peek = () => tokens[position];
    function primary() {
      const token = tokens[position++];
      if (token === undefined || token === '.' || token === '$') fail('Keep typing', 'incomplete');
      if (token === '+' || token === '-') {
        const value = primary();
        return token === '-' ? fraction(-value.n, value.d) : value;
      }
      if (token === '(') {
        const value = sum();
        if (peek() === undefined) fail('Close the parenthesis', 'incomplete');
        if (tokens[position++] !== ')') fail('Check the parentheses');
        return value;
      }
      if (token.startsWith('$')) {
        const row = Number(token.slice(1));
        if (row < 1 || row > previous.length) fail('Reference an earlier row, such as $1');
        if (previous[row - 1].status !== 'valid') fail(`Waiting for row ${row}`, 'waiting');
        return previous[row - 1].value;
      }
      if (/^[A-Za-z_]/.test(token)) {
        const variable = variables.get(token);
        if (!variable) fail(`Unknown variable: ${token}`);
        if (variable.status !== 'valid') fail(variable.message);
        return variable.value;
      }
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) fail('Check this expression');
      const decimals = token.split('.')[1]?.length ?? 0;
      return fraction(BigInt(token.replace('.', '')), 10n ** BigInt(decimals));
    }
    function product() {
      let value = primary();
      while (peek() === '*' || peek() === '/') value = operate(value, tokens[position++], primary());
      return value;
    }
    function sum() {
      let value = product();
      while (peek() === '+' || peek() === '-') value = operate(value, tokens[position++], product());
      return value;
    }
    const value = sum();
    if (position !== tokens.length) fail('Add an operator between values');
    return { status: 'valid', value };
  } catch (error) {
    return error.status ? error : { status: 'error', message: 'This expression is too complex' };
  }
}

export function evaluateWorksheet(rows, variables = []) {
  const { bindings } = evaluateVariables(variables);
  const results = [];
  for (const expression of rows) results.push(calculate(expression, results, bindings));
  return results;
}

export function formatValue({ n, d }) {
  if (d === 1n) return String(n);
  const scaled = abs(n) * 100n;
  const rounded = scaled / d + (scaled % d * 2n >= d ? 1n : 0n);
  const sign = n < 0n && rounded !== 0n ? '-' : '';
  return `${scaled % d ? '≈ ' : ''}${sign}${rounded / 100n}.${String(rounded % 100n).padStart(2, '0')}`;
}
