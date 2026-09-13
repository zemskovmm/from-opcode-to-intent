// A small arithmetic parser. Expressions never execute as JavaScript.
class ExpressionIssue extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (message) => { throw new ExpressionIssue('error', message); };
const pending = (message = 'Keep typing — this expression is unfinished.') => {
  throw new ExpressionIssue('pending', message);
};

export function calculate(source, earlierRows = [], variables = new Map()) {
  if (!source.trim()) return { status: 'empty' };
  if (source.length > 500) return { status: 'error', message: 'Use up to 500 characters per row.' };
  const text = source.replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-');
  let position = 0;
  const peek = () => { while (/\s/.test(text[position] ?? '') && position < text.length) position++; return text[position]; };
  const finite = (value) => {
    if (!Number.isFinite(value)) fail('This calculation has no finite real result.');
    return value;
  };
  function atom() {
    const char = peek();
    if (char === undefined) pending();
    if (char === '+' || char === '-') {
      position++;
      return (char === '-' ? -1 : 1) * expression(25);
    }
    if (char === '√') { position++; return finite(Math.sqrt(expression(25))); }
    if (char === '(') {
      position++;
      const value = expression(0);
      if (peek() === undefined) pending('Add a closing parenthesis.');
      if (peek() !== ')') fail('Check the parentheses.');
      position++;
      return value;
    }
    if (char === '$') {
      position++;
      const match = text.slice(position).match(/^\d+/);
      if (!match) { if (peek() === undefined) pending('Add an earlier row number after $.'); fail('Use a reference such as $1.'); }
      position += match[0].length;
      const index = Number(match[0]) - 1;
      if (!/^[1-9]$/.test(match[0]) || index >= earlierRows.length) fail('Reference an earlier row, using $1 through $9.');
      const row = earlierRows[index];
      if (row.status !== 'ok') pending(`Waiting for a result on row ${index + 1}.`);
      return row.value;
    }
    const identifier = text.slice(position).match(/^[A-Za-z][A-Za-z0-9_]*/);
    if (identifier) {
      const name = identifier[0];
      position += name.length;
      const variable = variables.get(name);
      if (!variable) fail(`Unknown variable “${name}”. Add it in Variables.`);
      if (variable.status !== 'ok') throw new ExpressionIssue(variable.status, `${name}: ${variable.message}`);
      return variable.value;
    }
    const number = text.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (number) { position += number[0].length; return finite(Number(number[0])); }
    if (char === '.' && !text.slice(position + 1).trim()) pending('Add a digit after the decimal point.');
    fail('Check this expression. Use numbers and calculator operations.');
  }
  function expression(minimum) {
    let left = atom();
    while (true) {
      const operator = peek();
      if (operator === '%' || operator === '²') {
        if (40 < minimum) break;
        position++;
        left = finite(operator === '%' ? left / 100 : left * left);
        continue;
      }
      const precedence = { '+': 10, '-': 10, '*': 20, '/': 20, '^': 30 }[operator];
      if (precedence === undefined || precedence < minimum) break;
      position++;
      const right = expression(precedence + (operator === '^' ? 0 : 1));
      if (operator === '/' && right === 0) fail('Division by zero has no result.');
      left = finite(operator === '+' ? left + right : operator === '-' ? left - right :
        operator === '*' ? left * right : operator === '/' ? left / right : left ** right);
    }
    return left;
  }
  try {
    const value = expression(0);
    if (peek() !== undefined) fail('Check the expression. Put an operator between values.');
    return { status: 'ok', value };
  } catch (error) {
    if (!(error instanceof ExpressionIssue)) throw error;
    return { status: error.status, message: error.message };
  }
}

export function calculateRows(expressions, variables = []) {
  const { values } = evaluateVariables(variables);
  const rows = [];
  for (let i = 0; i < 10; i++) rows.push(calculate(expressions[i] ?? '', rows, values));
  return rows;
}

export function formatResult(value) {
  if (value === 0) return '0';
  if (Number.isInteger(value)) return value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 });
  const display = value.toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return display === '-0.00' ? '0.00' : display;
}

export function evaluateVariables(variables) {
  const names = variables.map(variable => variable.name.trim());
  const counts = new Map();
  names.forEach(name => counts.set(name, (counts.get(name) || 0) + 1));
  const values = new Map();
  const rows = variables.map((variable, index) => {
    const name = names[index];
    if (!/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(name)) {
      return { status: 'error', field: 'name', message: 'Use 1–32 letters, digits or underscores; start with a letter.' };
    }
    const text = variable.value.trim().replaceAll('−', '-');
    let result;
    if (counts.get(name) > 1) result = { status: 'error', field: 'name', message: 'Choose a unique name. This name is used more than once.' };
    else if (/^[+-]?\.?$/.test(text)) result = { status: 'pending', field: 'value', message: 'Enter a numeric value.' };
    else if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) || !Number.isFinite(Number(text))) {
      result = { status: 'error', field: 'value', message: 'Use a finite decimal number, without expressions or units.' };
    } else result = { status: 'ok', value: Number(text) };
    values.set(name, result);
    return result;
  });
  return { rows, values };
}

export function summarizeRows(rows) {
  let value = 0;
  let included = 0;
  const excluded = [];
  rows.forEach((row, index) => {
    if (row.status === 'ok') { value += row.value; included++; }
    else excluded.push({ line: index + 1, status: row.status });
  });
  if (!Number.isFinite(value)) return { status: 'error', message: 'The total is too large to display.', included, excluded };
  return { status: 'ok', value, included, excluded };
}
