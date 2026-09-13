import { evaluateRows, formatResult, insertAtSelection } from './calculator.js';
import { backspaceAtSelection, referencesForRow } from './interaction.js';
import { loadActiveRow, loadExpressions, saveActiveRow, saveExpressions } from './storage.js';

const storage = (() => {
  try { return globalThis.localStorage; } catch { return null; }
})();
const expressions = loadExpressions(storage);
const rowsElement = document.querySelector('#rows');
const referencesElement = document.querySelector('#references');
let activeRow = loadActiveRow(storage);

function statusText(result) {
  if (result.status === 'value') return formatResult(result.value);
  if (result.status === 'incomplete') return 'Continue expression';
  if (result.status === 'invalid') return 'Invalid expression';
  if (result.status === 'needs') return `Needs $${result.reference}`;
  return '';
}

function renderOutcomes() {
  const outcomes = evaluateRows(expressions);
  outcomes.forEach((outcome, index) => {
    const output = document.querySelector(`#result-${index + 1}`);
    output.textContent = statusText(outcome);
    output.dataset.status = outcome.status;
  });
}

function focusRow(index) {
  activeRow = index;
  saveActiveRow(storage, activeRow);
  document.querySelectorAll('.calc-row').forEach((row, rowIndex) => row.classList.toggle('active', rowIndex === index));
  renderReferences();
  const input = inputForActiveRow();
  if (input && document.activeElement !== input) input.focus();
}

function renderReferences() {
  referencesElement.replaceChildren();
  if (activeRow === 0) {
    referencesElement.textContent = 'References appear for later rows.';
    return;
  }
  const label = document.createElement('span');
  label.textContent = 'Insert reference';
  referencesElement.append(label);
  for (const token of referencesForRow(activeRow + 1)) {
    const button = document.createElement('button');
    button.className = 'reference';
    button.textContent = token;
    button.dataset.token = token;
    button.setAttribute('aria-label', `Insert reference to row ${token.slice(1)}`);
    referencesElement.append(button);
  }
}

function inputForActiveRow() {
  return document.querySelector(`#expression-${activeRow + 1}`);
}

function updateExpression(input) {
  expressions[activeRow] = input.value;
  saveExpressions(storage, expressions);
  renderOutcomes();
}

function insert(token) {
  const input = inputForActiveRow();
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.value = insertAtSelection(input.value, start, end, token);
  const caret = start + token.length;
  input.focus();
  input.setSelectionRange(caret, caret);
  updateExpression(input);
}

function backspace() {
  const input = inputForActiveRow();
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  const next = backspaceAtSelection(input.value, start, end);
  input.value = next.text;
  input.focus();
  input.setSelectionRange(next.caret, next.caret);
  updateExpression(input);
}

function createRows() {
  for (let index = 0; index < 10; index += 1) {
    const row = document.createElement('div');
    row.className = 'calc-row';
    row.innerHTML = `<label for="expression-${index + 1}">${index + 1}</label><input id="expression-${index + 1}" type="text" inputmode="text" autocomplete="off" spellcheck="false" aria-label="Expression for row ${index + 1}"><output id="result-${index + 1}" aria-live="polite"></output>`;
    const input = row.querySelector('input');
    input.value = expressions[index];
    input.addEventListener('focus', () => focusRow(index));
    input.addEventListener('click', () => focusRow(index));
    input.addEventListener('input', () => updateExpression(input));
    rowsElement.append(row);
  }
}

document.querySelector('.keypad').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.action === 'clear') {
    const input = inputForActiveRow();
    input.value = '';
    input.focus();
    updateExpression(input);
  } else if (button.dataset.action === 'backspace') {
    backspace();
  } else if (button.dataset.token) {
    insert(button.dataset.token);
  }
});

createRows();
focusRow(activeRow);
renderOutcomes();
