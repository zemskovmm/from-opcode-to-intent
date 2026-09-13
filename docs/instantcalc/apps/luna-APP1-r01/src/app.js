import { evaluateExpression } from './evaluator.js';
import { loadActiveRow, loadVariables, saveActiveRow, saveVariables } from './persistence.js';
import { summarizeResults } from './summary.js';
import { isValidVariableName, resolveVariables } from './variables.js';

const STORAGE_KEY = 'instantcalc-demo:luna-APP1-r01:instant-calculator.rows.v1';
const rowCount = 10;
const expressions = loadExpressions();
const variableRows = loadVariables(localStorage);
const inputs = [];
let activeRow = loadActiveRow(localStorage, rowCount);

const rowsElement = document.querySelector('#rows');
const variablesElement = document.querySelector('#variables');
const saveState = document.querySelector('#save-state');
const activeLineLabel = document.querySelector('#active-line-label');
const totalResult = document.querySelector('#total-result');
const totalMeta = document.querySelector('#total-meta');

for (let index = 0; index < rowCount; index += 1) {
  const row = document.createElement('div');
  row.className = 'calc-row';
  row.dataset.row = index;
  row.innerHTML = `
    <span class="line-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
    <label class="sr-only" for="line-${index + 1}">Line ${index + 1} expression</label>
    <input id="line-${index + 1}" class="expression-input" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="Enter an expression" />
    <div class="row-result" aria-live="polite"></div>
  `;
  rowsElement.append(row);

  const input = row.querySelector('input');
  input.value = expressions[index];
  input.addEventListener('focus', () => setActiveRow(index));
  input.addEventListener('input', () => {
    expressions[index] = input.value;
    saveExpressions();
    recalculate();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' && index > 0) {
      event.preventDefault();
      focusRow(index - 1);
    }
    if (event.key === 'ArrowDown' && index < rowCount - 1) {
      event.preventDefault();
      focusRow(index + 1);
    }
  });
  inputs.push(input);
}

renderVariables();

document.querySelector('#add-variable').addEventListener('click', () => {
  variableRows.push({ name: '', value: '' });
  saveVariables(localStorage, variableRows);
  renderVariables(variableRows.length - 1);
});

document.querySelector('#keypad').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.value) insertText(button.dataset.value);
  if (button.dataset.action === 'backspace') backspace();
  if (button.dataset.action === 'clear') clearCurrentRow();
  if (button.dataset.action === 'clear-all') clearAllRows();
  if (button.dataset.action === 'previous') focusRow(Math.max(0, activeRow - 1));
  if (button.dataset.action === 'next') focusRow(Math.min(rowCount - 1, activeRow + 1));
});

function loadExpressions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return Array.from({ length: rowCount }, (_, index) => String(saved[index] ?? ''));
  } catch {
    // An unavailable or malformed local store should not prevent calculation.
  }
  return Array(rowCount).fill('');
}

function saveExpressions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expressions));
    saveState.textContent = 'Saved locally';
  } catch {
    saveState.textContent = 'Local save unavailable';
  }
}

function renderVariables(focusIndex = null) {
  variablesElement.replaceChildren();
  variableRows.forEach((variable, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><label class="sr-only" for="variable-name-${index}">Variable ${index + 1} name</label><input id="variable-name-${index}" class="variable-name" autocomplete="off" spellcheck="false" placeholder="e.g. rate" /></td>
      <td><label class="sr-only" for="variable-value-${index}">Variable ${index + 1} value</label><input id="variable-value-${index}" class="variable-value" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="0" /></td>
      <td class="variable-reference" aria-live="polite"><span class="variable-reference-code">—</span><span class="variable-status"></span></td>
    `;
    variablesElement.append(row);

    const nameInput = row.querySelector('.variable-name');
    const valueInput = row.querySelector('.variable-value');
    nameInput.value = variable.name;
    valueInput.value = variable.value;

    nameInput.addEventListener('input', () => {
      variable.name = nameInput.value;
      saveVariables(localStorage, variableRows);
      updateVariableFeedback();
      recalculate();
    });
    valueInput.addEventListener('input', () => {
      variable.value = valueInput.value;
      saveVariables(localStorage, variableRows);
      updateVariableFeedback();
      recalculate();
    });
  });

  updateVariableFeedback();

  if (focusIndex !== null) {
    const newNameInput = variablesElement.querySelector(`#variable-name-${focusIndex}`);
    newNameInput?.focus();
  }
}

function updateVariableFeedback() {
  const resolution = resolveVariables(variableRows);
  variablesElement.querySelectorAll('tr').forEach((row, index) => {
    const referenceCode = row.querySelector('.variable-reference-code');
    const status = row.querySelector('.variable-status');
    const name = variableRows[index].name;
    const rowStatus = resolution.statuses[index];
    referenceCode.textContent = isValidVariableName(name) ? `@${name}` : '—';
    status.textContent = {
      duplicate: 'duplicate name',
      invalid: 'invalid name',
      'empty-value': 'number needed',
      'invalid-value': 'number needed',
    }[rowStatus] ?? '';
    row.classList.toggle('has-duplicate', rowStatus === 'duplicate');
  });
}

function setActiveRow(index) {
  activeRow = index;
  saveActiveRow(localStorage, index, rowCount);
  document.querySelectorAll('.calc-row').forEach((row, rowIndex) => {
    row.classList.toggle('is-active', rowIndex === activeRow);
  });
  activeLineLabel.textContent = `Line ${String(index + 1).padStart(2, '0')} selected`;
}

function focusRow(index) {
  inputs[index].focus();
  inputs[index].setSelectionRange(inputs[index].value.length, inputs[index].value.length);
  setActiveRow(index);
}

function insertText(text) {
  const input = inputs[activeRow];
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.setRangeText(text, start, end, 'end');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}

function backspace() {
  const input = inputs[activeRow];
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  if (start === 0 && end === 0) return;
  if (start === end) input.setSelectionRange(Math.max(0, start - 1), end);
  input.setRangeText('', input.selectionStart, input.selectionEnd, 'end');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}

function clearCurrentRow() {
  inputs[activeRow].value = '';
  inputs[activeRow].dispatchEvent(new Event('input', { bubbles: true }));
  inputs[activeRow].focus();
}

function clearAllRows() {
  if (!expressions.some(Boolean) || window.confirm('Clear all ten lines?')) {
    inputs.forEach((input) => { input.value = ''; });
    expressions.fill('');
    saveExpressions();
    recalculate();
    inputs[activeRow].focus();
  }
}

function recalculate() {
  const variableValues = resolveVariables(variableRows).values;
  let values = Array(rowCount).fill(null);
  let states = expressions.map((expression) => evaluateExpression(expression, values, variableValues));

  // A few passes allow a line to reference a later line while keeping cycles unresolved.
  for (let pass = 0; pass < rowCount; pass += 1) {
    const nextValues = states.map((state) => state.status === 'ok' ? state.value : null);
    const nextStates = expressions.map((expression) => evaluateExpression(expression, nextValues, variableValues));
    states = nextStates;
    if (nextValues.every((value, index) => value === values[index])) break;
    values = nextValues;
  }

  document.querySelectorAll('.calc-row').forEach((row, index) => {
    const result = row.querySelector('.row-result');
    const state = states[index];
    row.classList.remove('is-incomplete', 'is-error');
    if (state.status === 'ok') {
      result.textContent = formatValue(state.value);
      result.className = 'row-result has-value';
    } else {
      result.textContent = state.status === 'incomplete' ? (expressions[index] ? 'unfinished' : '') : 'check expression';
      result.className = 'row-result';
      if (state.status === 'incomplete') row.classList.add('is-incomplete');
      if (state.status === 'error') row.classList.add('is-error');
    }
  });

  const summary = summarizeResults(states);
  totalResult.textContent = formatValue(summary.total);
  totalMeta.textContent = summary.excluded ? `${summary.excluded} excluded` : 'all lines included';
}

function formatValue(value) {
  if (Object.is(value, -0)) return '0';
  return Number(value.toPrecision(12)).toLocaleString('en-US', { maximumFractionDigits: 10 });
}

setActiveRow(activeRow);
recalculate();
