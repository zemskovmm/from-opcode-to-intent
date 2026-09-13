const issue = (status, message) => ({ status, message });
const incomplete = () => { throw issue('incomplete', 'Keep typing'); };
const invalid = (message = 'Check expression') => { throw issue('error', message); };

const variableName = /^[A-Za-z_][A-Za-z_0-9]*$/;
const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

export function validateVariables(variables) {
  const names = variables.map(variable => variable.name.trim());
  const counts = new Map();
  names.forEach(name => counts.set(name, (counts.get(name) ?? 0) + 1));
  return variables.map((variable, index) => {
    const name = names[index];
    const value = variable.value.trim();
    if (!name) return issue('incomplete', 'Enter a name');
    if (!variableName.test(name)) return issue('error', 'Use a name like unit_price');
    if (counts.get(name) > 1) return issue('error', `Duplicate variable ${name}`);
    if (/^[+-]?\.?$/.test(value)) return issue('incomplete', `Waiting for variable ${name}`);
    if (!decimal.test(value) || !Number.isFinite(Number(value))) return issue('error', `Check variable ${name}: enter a number`);
    return { status: 'ok', value: Number(value) };
  });
}

export function summarize(results) {
  const total = { status: 'ok', value: 0, included: 0, blank: [], excluded: [] };
  results.forEach((result, index) => {
    if (result.status === 'ok') {
      total.value += result.value;
      total.included++;
    } else (result.status === 'empty' ? total.blank : total.excluded).push(index + 1);
  });
  if (!Number.isFinite(total.value)) {
    delete total.value;
    Object.assign(total, issue('error', 'Total is too large'));
  }
  return total;
}

// Parse the whole expression before resolving references, so unfinished input
// remains unfinished even when a dependency is currently unavailable.
function parse(source) {
  const tokens = source.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-')
    .match(/\$\d*|[A-Za-z_][A-Za-z_0-9]*|\d+(?:\.\d*)?|\.\d+|[^\s]/g) ?? [];
  let position = 0;
  const peek = () => tokens[position];
  function primary() {
    const token = tokens[position++];
    if (token === undefined) incomplete();
    if (token === '$' || token === '.') {
      if (position === tokens.length) incomplete();
      invalid();
    }
    if (token === '(') {
      const node = sum();
      if (peek() === undefined) incomplete();
      if (tokens[position++] !== ')') invalid();
      return node;
    }
    if (/^\$\d+$/.test(token)) {
      const row = Number(token.slice(1));
      if (row < 1 || row > 10) invalid('Use a row from 1 to 10');
      return { ref: row - 1 };
    }
    if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return { number: Number(token) };
    if (variableName.test(token)) return { variable: token };
    invalid();
  }
  function unary() {
    if (peek() === '+' || peek() === '-') {
      const op = tokens[position++];
      return { op, left: { number: 0 }, right: unary() };
    }
    let node = primary();
    while (peek() === '%') {
      position++;
      node = { op: '/', left: node, right: { number: 100 } };
    }
    return node;
  }
  function product() {
    let node = unary();
    while (peek() === '*' || peek() === '/') {
      const op = tokens[position++];
      node = { op, left: node, right: unary() };
    }
    return node;
  }
  function sum() {
    let node = product();
    while (peek() === '+' || peek() === '-') {
      const op = tokens[position++];
      node = { op, left: node, right: product() };
    }
    return node;
  }
  const tree = sum();
  if (position !== tokens.length) invalid();
  return tree;
}

export function calculate(expressions, variables = []) {
  const checked = validateVariables(variables);
  const values = new Map(variables.map((variable, index) => [variable.name.trim(), checked[index]]));
  const trees = Array.from({ length: 10 }, (_, row) => {
    const source = expressions[row]?.trim() ?? '';
    if (!source) return issue('empty', '');
    try { return parse(source); }
    catch (error) { return error.status ? error : issue('error', 'Expression is too complex'); }
  });
  // Detect cycles before arithmetic: another unavailable operand must not mask one.
  const references = trees.map((tree, row) => tree.status ? []
    : [...new Set([...expressions[row].matchAll(/\$(\d+)/g)].map(match => Number(match[1]) - 1))]);
  function reachesCycle(row, path = new Set()) {
    if (path.has(row)) return true;
    return references[row].some(source => reachesCycle(source, new Set([...path, row])));
  }
  const results = trees.map((_, row) => reachesCycle(row) ? issue('cycle', 'Circular reference') : undefined);
  function evaluate(node) {
    if ('number' in node) return node.number;
    if ('variable' in node) {
      const result = values.get(node.variable);
      if (!result) invalid(`Unknown variable ${node.variable}`);
      if (result.status === 'incomplete') throw issue('waiting', result.message);
      if (result.status !== 'ok') throw result;
      return result.value;
    }
    if ('ref' in node) {
      const result = resolve(node.ref);
      if (result.status === 'cycle') throw result;
      if (['empty', 'incomplete', 'waiting'].includes(result.status)) {
        throw issue('waiting', `Waiting for row ${node.ref + 1}`);
      }
      if (result.status !== 'ok') invalid(`Check row ${node.ref + 1}`);
      return result.value;
    }
    const left = evaluate(node.left);
    const right = evaluate(node.right);
    if (node.op === '/' && right === 0) invalid('Cannot divide by zero');
    return node.op === '+' ? left + right : node.op === '-' ? left - right
      : node.op === '*' ? left * right : left / right;
  }
  function resolve(row) {
    if (results[row]) return results[row];
    if (trees[row].status) return results[row] = trees[row];
    try {
      const value = evaluate(trees[row]);
      if (!Number.isFinite(value)) invalid('Result is too large');
      results[row] = { status: 'ok', value };
    } catch (error) {
      results[row] = error.status ? error : issue('error', 'Expression is too complex');
    }
    return results[row];
  }
  return Array.from({ length: 10 }, (_, row) => resolve(row));
}

export function format(value) {
  return value.toLocaleString('en-US', {
    useGrouping: false,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).replace(/^-0(?:\.00)?$/, Number.isInteger(value) ? '0' : '0.00');
}
