import { formatResult } from './calculator.js';
import { parseWorksheetState, serializeWorksheetState, VARIABLE_COUNT } from './persistence.js';
import { calculateRows, calculateTotal, ROW_COUNT } from './worksheet.js';

const STORAGE_KEY = 'instantcalc-demo:terra-APP3-r01:instantcalc.expressions.v1';
const rowsElement = document.querySelector('#rows');
const variablesElement = document.querySelector('#variables');
const totalElement = document.querySelector('#total');
const announcer = document.querySelector('#announcer');
const savedState = loadWorksheetState();
const expressions = savedState.expressions;
const variables = savedState.variables.map((variable) => ({
  name: variable.name ?? '',
  value: variable.value ?? ''
}));
let activeIndex = savedState.activeIndex;

function loadWorksheetState() {
  try {
    return parseWorksheetState(localStorage.getItem(STORAGE_KEY));
  } catch {
    // A damaged local value should never prevent a fresh worksheet from opening.
    return parseWorksheetState(null);
  }
}

function saveWorksheetState() {
  try {
    localStorage.setItem(STORAGE_KEY, serializeWorksheetState(expressions, activeIndex, variables));
  } catch {
    announcer.textContent = 'Changes could not be saved on this device.';
  }
}

function createVariables() {
  for (let index = 0; index < VARIABLE_COUNT; index += 1) {
    const row = document.createElement('tr');
    row.dataset.index = String(index);
    row.innerHTML = `
      <td>
        <label class="sr-only" for="variable-name-${index + 1}">Variable ${index + 1} name</label>
        <input id="variable-name-${index + 1}" class="variable-name" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="rate" />
      </td>
      <td>
        <label class="sr-only" for="variable-value-${index + 1}">Value for variable ${index + 1}</label>
        <input id="variable-value-${index + 1}" class="variable-value" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="0.00" />
      </td>
      <td><button type="button" class="use-variable">Use</button></td>
      <td class="variable-status" aria-live="polite"></td>
    `;
    const nameInput = row.querySelector('.variable-name');
    const valueInput = row.querySelector('.variable-value');
    nameInput.value = variables[index].name;
    valueInput.value = variables[index].value;
    nameInput.addEventListener('input', () => updateVariable(index, 'name', nameInput.value));
    valueInput.addEventListener('input', () => updateVariable(index, 'value', valueInput.value));
    row.querySelector('.use-variable').addEventListener('click', () => {
      const state = resolveVariables().rows[index];
      if (state.kind !== 'value') return;
      insertKey(`@${state.name}`);
    });
    variablesElement.append(row);
  }
}

function updateVariable(index, field, value) {
  variables[index][field] = value;
  saveWorksheetState();
  renderResults();
}

function isVariableName(value) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function numberValue(value) {
  const text = value.trim();
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
}

function resolveVariables() {
  const names = variables.map((variable) => variable.name.trim());
  const counts = new Map();
  names.forEach((name) => {
    if (isVariableName(name)) counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  const values = Object.create(null);
  const rows = variables.map((variable, index) => {
    const name = names[index];
    const value = variable.value.trim();
    if (!name && !value) return { kind: 'empty' };
    if (!isVariableName(name)) return { kind: 'invalid', message: 'Use a name' };
    if (counts.get(name) > 1) {
      values[name] = undefined;
      return { kind: 'invalid', message: 'Duplicate name' };
    }
    const number = numberValue(value);
    if (number === undefined) {
      values[name] = undefined;
      return { kind: 'waiting', name, message: 'Enter a number' };
    }
    values[name] = number;
    return { kind: 'value', name };
  });
  return { rows, values };
}

function createRows() {
  for (let index = 0; index < ROW_COUNT; index += 1) {
    const row = document.createElement('div');
    row.className = 'calc-row';
    row.dataset.index = String(index);
    row.innerHTML = `
      <span class="line-number" aria-hidden="true">${index + 1}</span>
      <label class="sr-only" for="expression-${index + 1}">Expression for line ${index + 1}</label>
      <input id="expression-${index + 1}" class="expression" type="text" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Enter calculation" />
      <span class="line-output" role="status" aria-live="polite"></span>
    `;
    const input = row.querySelector('input');
    input.value = expressions[index];
    input.addEventListener('focus', () => setActive(index));
    input.addEventListener('click', () => setActive(index));
    input.addEventListener('input', () => {
      expressions[index] = input.value;
      setActive(index);
      saveWorksheetState();
      renderResults();
    });
    rowsElement.append(row);
  }
}

function setActive(index) {
  activeIndex = index;
  document.querySelectorAll('.calc-row').forEach((row, rowIndex) => {
    row.classList.toggle('is-active', rowIndex === activeIndex);
  });
  saveWorksheetState();
}

function renderResults() {
  const variableState = resolveVariables();
  renderVariableStates(variableState.rows);
  const results = calculateRows(expressions, variableState.values);
  results.forEach((result, index) => {
    const row = rowsElement.children[index];
    const output = row.querySelector('.line-output');
    row.dataset.state = result.kind;
    output.replaceChildren();

    if (result.kind === 'value') {
      const copy = document.createElement('button');
      copy.type = 'button';
      copy.className = 'result-button';
      copy.textContent = formatResult(result.value);
      copy.setAttribute('aria-label', `Line ${index + 1} result ${copy.textContent}. Copy result.`);
      copy.title = 'Copy result';
      copy.addEventListener('click', () => copyResult(copy.textContent));
      output.append(copy);
      return;
    }

    if (result.kind === 'incomplete') output.textContent = 'Continue';
    if (result.kind === 'waiting') output.textContent = `Waiting for #${result.line}`;
    if (result.kind === 'waitingVariable') output.textContent = `Waiting for @${result.name}`;
    if (result.kind === 'invalid') output.textContent = result.message;
  });
  renderTotal(calculateTotal(results));
}

function renderVariableStates(states) {
  states.forEach((state, index) => {
    const row = variablesElement.children[index];
    const button = row.querySelector('.use-variable');
    const status = row.querySelector('.variable-status');
    row.dataset.state = state.kind;
    button.disabled = state.kind !== 'value';
    status.textContent = state.kind === 'invalid' || state.kind === 'waiting' ? state.message : '';
  });
}

function renderTotal(total) {
  totalElement.querySelector('.total-value').textContent = formatResult(total.value);
  totalElement.querySelector('.total-note').textContent = total.excluded
    ? `${total.excluded} excluded`
    : '';
}

async function copyResult(value) {
  try {
    await navigator.clipboard.writeText(value);
    announcer.textContent = `${value} copied.`;
  } catch {
    announcer.textContent = 'Copying is unavailable in this browser.';
  }
}

function activeInput() {
  return rowsElement.querySelector(`#expression-${activeIndex + 1}`);
}

function insertKey(key) {
  const input = activeInput();
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.value = `${input.value.slice(0, start)}${key}${input.value.slice(end)}`;
  input.setSelectionRange(start + key.length, start + key.length);
  expressions[activeIndex] = input.value;
  saveWorksheetState();
  renderResults();
  input.focus();
}

function backspace() {
  const input = activeInput();
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  if (start === 0 && end === 0) return;
  const deleteStart = start === end ? start - 1 : start;
  input.value = `${input.value.slice(0, deleteStart)}${input.value.slice(end)}`;
  input.setSelectionRange(deleteStart, deleteStart);
  expressions[activeIndex] = input.value;
  saveWorksheetState();
  renderResults();
  input.focus();
}

function clearActiveLine() {
  const input = activeInput();
  input.value = '';
  expressions[activeIndex] = '';
  saveWorksheetState();
  renderResults();
  input.focus();
}

document.querySelector('.keypad-grid').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.key) insertKey(button.dataset.key);
  if (button.dataset.action === 'backspace') backspace();
  if (button.dataset.action === 'clear-line') clearActiveLine();
});

document.querySelector('#clear-all').addEventListener('click', () => {
  if (!window.confirm('Clear all 10 calculations?')) return;
  expressions.fill('');
  rowsElement.querySelectorAll('input').forEach((input) => { input.value = ''; });
  saveWorksheetState();
  renderResults();
  activeInput().focus();
  announcer.textContent = 'All lines cleared.';
});

createRows();
createVariables();
setActive(activeIndex);
renderResults();
