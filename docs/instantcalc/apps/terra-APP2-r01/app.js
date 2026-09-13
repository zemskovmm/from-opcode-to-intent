import { calculateRows, calculateTotal, formatResult } from './src/calculator.js';
import { restoreWorksheet, serializeWorksheet } from './src/worksheet-state.js';

const STORAGE_KEY = 'instantcalc-demo:terra-APP2-r01:instantcalc-v1';
const statusText = {
  incomplete: 'Continue expression',
  invalid: 'Check expression',
  circular: 'Circular reference',
  undefined: 'Undefined',
  'no-real-result': 'No real result',
  'out-of-range': 'Result out of range'
};
const keys = [
  ['(', 'insert'], [')', 'insert'], ['%', 'insert'], ['÷', 'insert'], ['Clear', 'clear'],
  ['7', 'insert'], ['8', 'insert'], ['9', 'insert'], ['×', 'insert'], ['⌫', 'backspace'],
  ['4', 'insert'], ['5', 'insert'], ['6', 'insert'], ['−', 'insert'], ['^', 'insert'],
  ['1', 'insert'], ['2', 'insert'], ['3', 'insert'], ['+', 'insert'], ['√(', 'insert'],
  ['0', 'insert'], ['.', 'insert'], ['$', 'insert'], ['π', 'insert'], ['e', 'insert']
];

function loadWorksheet() {
  try { return restoreWorksheet(localStorage.getItem(STORAGE_KEY)); } catch { return restoreWorksheet(null); }
}

const restoredWorksheet = loadWorksheet();
let expressions = restoredWorksheet.expressions;
let activeIndex = restoredWorksheet.activeIndex;
let variables = restoredWorksheet.variables.length ? restoredWorksheet.variables : [{ name: '', value: '' }];
const rowsElement = document.querySelector('#rows');
const totalElement = document.querySelector('#total');
const variablesElement = document.querySelector('#variables');
const addVariableButton = document.querySelector('#add-variable');
const keypadElement = document.querySelector('#keypad');

function save() {
  try { localStorage.setItem(STORAGE_KEY, serializeWorksheet(expressions, activeIndex, variables)); } catch { /* The calculator still works for this session. */ }
}

function displayStatus(row) {
  if (row.state === 'result') return formatResult(row.value);
  if (row.state === 'blank') return '';
  if (row.state === 'waiting') return `Waiting for $${row.waitingFor}`;
  return statusText[row.state] || 'Check expression';
}

function variableContext() {
  const validName = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const counts = new Map();
  variables.forEach((variable) => {
    const name = variable.name.trim();
    if (validName.test(name)) counts.set(name, (counts.get(name) || 0) + 1);
  });
  const values = Object.create(null);
  const issues = [];
  variables.forEach((variable, index) => {
    const name = variable.name.trim();
    const value = variable.value.trim();
    if (!name && !value) return;
    if (!validName.test(name)) issues[index] = 'Use letters, numbers, or _';
    else if (counts.get(name) > 1) issues[index] = 'Name already used';
    else if (!value || !Number.isFinite(Number(value))) issues[index] = 'Enter a number';
    else values[name] = Number(value);
  });
  return { values, issues };
}

function updateVariableFeedback(context) {
  document.querySelectorAll('.variable-status').forEach((status, index) => {
    status.textContent = context.issues[index] || '';
    status.dataset.state = context.issues[index] ? 'invalid' : '';
  });
}

function updateRows(context = variableContext()) {
  const calculated = calculateRows(expressions, context.values);
  calculated.forEach((row, index) => {
    const result = document.querySelector(`#result-${index}`);
    result.textContent = displayStatus(row);
    result.dataset.state = row.state;
    result.setAttribute('aria-label', row.state === 'result' ? `Result: ${result.textContent}` : result.textContent || 'No result');
  });
  const total = calculateTotal(calculated);
  totalElement.textContent = `${formatResult(total.value)}${total.excluded ? ` · ${total.excluded} excluded` : ''}`;
  totalElement.setAttribute('aria-label', `Total ${formatResult(total.value)}${total.excluded ? `, ${total.excluded} excluded` : ', all lines included'}`);
}

function refreshCalculations() {
  const context = variableContext();
  updateVariableFeedback(context);
  updateRows(context);
}

function setActive(index) {
  activeIndex = index;
  document.querySelectorAll('.calculation-row').forEach((row, rowIndex) => row.classList.toggle('active', rowIndex === index));
  save();
}

function createRows() {
  rowsElement.innerHTML = expressions.map((expression, index) => `
    <div class="calculation-row${index === activeIndex ? ' active' : ''}">
      <label class="line-number" for="expression-${index}">${index + 1}</label>
      <input id="expression-${index}" class="expression" type="text" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false" value="${escapeHtml(expression)}" placeholder="Enter expression" aria-label="Expression for line ${index + 1}" />
      <output id="result-${index}" class="result" aria-live="polite"></output>
    </div>`).join('');
  document.querySelectorAll('.expression').forEach((input, index) => {
    input.addEventListener('focus', () => setActive(index));
    input.addEventListener('input', () => {
      expressions[index] = input.value;
      save();
      refreshCalculations();
    });
  });
  refreshCalculations();
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function replaceSelection(inserted) {
  const input = document.querySelector(`#expression-${activeIndex}`);
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.value = input.value.slice(0, start) + inserted + input.value.slice(end);
  const cursor = start + inserted.length;
  input.focus();
  input.setSelectionRange(cursor, cursor);
  expressions[activeIndex] = input.value;
  save();
  refreshCalculations();
}

function backspace() {
  const input = document.querySelector(`#expression-${activeIndex}`);
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  if (start === end && start === 0) return;
  input.value = input.value.slice(0, start === end ? start - 1 : start) + input.value.slice(end);
  const cursor = start === end ? start - 1 : start;
  input.focus();
  input.setSelectionRange(cursor, cursor);
  expressions[activeIndex] = input.value;
  save();
  refreshCalculations();
}

function createVariableTable() {
  variablesElement.innerHTML = variables.map((variable, index) => `
    <div class="variable-row" role="row">
      <div class="variable-name-wrap" role="cell"><span aria-hidden="true">@</span><input class="variable-name" data-index="${index}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" value="${escapeHtml(variable.name)}" placeholder="name" aria-label="Variable ${index + 1} name" /></div>
      <div role="cell"><input class="variable-value" data-index="${index}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="${escapeHtml(variable.value)}" placeholder="0" aria-label="Value for variable ${index + 1}" /><output class="variable-status" aria-live="polite"></output></div>
      <button class="remove-variable" data-index="${index}" type="button" aria-label="Remove variable ${index + 1}">×</button>
    </div>`).join('');
  variablesElement.querySelectorAll('.variable-name, .variable-value').forEach((input) => {
    input.addEventListener('input', () => {
      const index = Number(input.dataset.index);
      variables[index][input.classList.contains('variable-name') ? 'name' : 'value'] = input.value;
      save();
      refreshCalculations();
    });
  });
  variablesElement.querySelectorAll('.remove-variable').forEach((button) => {
    button.addEventListener('click', () => {
      variables.splice(Number(button.dataset.index), 1);
      if (!variables.length) variables.push({ name: '', value: '' });
      save();
      createVariableTable();
      refreshCalculations();
    });
  });
  updateVariableFeedback(variableContext());
}

function createKeypad() {
  keypadElement.innerHTML = keys.map(([label, action]) => `<button type="button" class="key ${action}" data-action="${action}" data-value="${label}" aria-label="${label === '⌫' ? 'Backspace' : label}">${label}</button>`).join('');
  keypadElement.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) event.preventDefault();
  });
  keypadElement.addEventListener('click', (event) => {
    const key = event.target.closest('button');
    if (!key) return;
    if (key.dataset.action === 'clear') {
      expressions[activeIndex] = '';
      const input = document.querySelector(`#expression-${activeIndex}`);
      input.value = '';
      input.focus();
      save();
      refreshCalculations();
      return;
    }
    if (key.dataset.action === 'backspace') return backspace();
    replaceSelection(key.dataset.value);
  });
}

createRows();
createVariableTable();
addVariableButton.addEventListener('click', () => {
  variables.push({ name: '', value: '' });
  save();
  createVariableTable();
  refreshCalculations();
  variablesElement.querySelector(`.variable-name[data-index="${variables.length - 1}"]`).focus();
});
createKeypad();
