import { calculateTotal, evaluateRows } from './calculator.js';
import { loadWorkspace, saveWorkspace, ROW_COUNT } from './workspace.js';

const rowCount = ROW_COUNT;
const worksheet = document.querySelector('#worksheet');
const references = document.querySelector('#references');
const variablesBody = document.querySelector('#variables-body');
const totalValue = document.querySelector('#total-value');
const totalNote = document.querySelector('#total-note');
const saveLabel = document.querySelector('#save-label');
const workspaceState = loadWorkspace(localStorage);
let rows = workspaceState.rows;
let activeRow = workspaceState.activeRow;
let variables = workspaceState.variables.length ? workspaceState.variables : [{ name: '', value: '' }];
let activeInput = null;

function saveRows() {
  try {
    saveWorkspace(localStorage, rows, activeRow, variables);
    saveLabel.textContent = 'Saved on this device';
  } catch {
    saveLabel.textContent = 'Not saved';
  }
}

function variableValues() {
  const values = {};
  variables.forEach(({ name, value }) => {
    const normalizedName = name.trim();
    const normalizedValue = value.trim();
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(normalizedName) || normalizedValue === '') return;
    const numericValue = Number(normalizedValue);
    if (Number.isFinite(numericValue)) values[normalizedName] = numericValue;
  });
  return values;
}

function createWorkspace() {
  for (let index = 0; index < rowCount; index += 1) {
    const row = document.createElement('div');
    row.className = 'calc-row';
    row.dataset.row = String(index);

    const number = document.createElement('button');
    number.type = 'button';
    number.className = 'line-number';
    number.textContent = String(index + 1);
    number.setAttribute('aria-label', `Focus line ${index + 1}`);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'expression';
    input.placeholder = index === 0 ? 'Start typing…' : 'Enter an expression';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.inputMode = 'decimal';
    input.setAttribute('aria-label', `Expression for line ${index + 1}`);
    input.value = rows[index];

    const result = document.createElement('output');
    result.className = 'result';
    result.setAttribute('aria-live', 'polite');
    result.setAttribute('aria-label', `Result for line ${index + 1}`);

    number.addEventListener('click', () => focusInput(input));
    input.addEventListener('focus', () => {
      activeInput = input;
      activeRow = index;
      saveRows();
    });
    input.addEventListener('input', () => {
      rows[index] = input.value;
      saveRows();
      renderResults();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        const next = worksheet.querySelector(`[data-row="${Math.min(index + 1, rowCount - 1)}"] .expression`);
        focusInput(next);
      }
      if (event.key === 'Escape') {
        input.value = '';
        input.dispatchEvent(new Event('input'));
      }
    });

    row.append(number, input, result);
    worksheet.append(row);
  }
}

function createReferenceButtons() {
  for (let index = 1; index <= rowCount; index += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reference';
    button.textContent = `$${index}`;
    button.setAttribute('aria-label', `Insert reference to line ${index}`);
    button.addEventListener('click', () => insertAtCursor(`$${index}`));
    references.append(button);
  }
}

function renderVariables() {
  variablesBody.replaceChildren();
  variables.forEach((variable, index) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const valueCell = document.createElement('td');
    const actionCell = document.createElement('td');

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'variable-input variable-name';
    nameInput.placeholder = 'e.g. tax_rate';
    nameInput.autocomplete = 'off';
    nameInput.spellcheck = false;
    nameInput.value = variable.name;
    nameInput.setAttribute('aria-label', `Variable name, row ${index + 1}`);

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'variable-input variable-value';
    valueInput.placeholder = '0';
    valueInput.inputMode = 'decimal';
    valueInput.value = variable.value;
    valueInput.setAttribute('aria-label', `Variable value, row ${index + 1}`);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-variable';
    removeButton.textContent = '×';
    removeButton.setAttribute('aria-label', `Remove variable row ${index + 1}`);
    removeButton.addEventListener('click', () => {
      variables.splice(index, 1);
      if (!variables.length) variables.push({ name: '', value: '' });
      renderVariables();
      saveRows();
      renderResults();
    });

    nameInput.addEventListener('input', () => {
      variable.name = nameInput.value;
      saveRows();
      renderResults();
    });
    valueInput.addEventListener('input', () => {
      variable.value = valueInput.value;
      saveRows();
      renderResults();
    });

    nameCell.append(nameInput);
    valueCell.append(valueInput);
    actionCell.append(removeButton);
    row.append(nameCell, valueCell, actionCell);
    variablesBody.append(row);
  });
}

function focusInput(input) {
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  activeInput = input;
}

function getActiveInput() {
  if (activeInput?.isConnected) return activeInput;
  return worksheet.querySelector('.expression');
}

function insertAtCursor(text) {
  const input = getActiveInput();
  if (!input) return;
  focusInput(input);
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.setRangeText(text, start, end, 'end');
  input.dispatchEvent(new Event('input'));
}

function backspace() {
  const input = getActiveInput();
  if (!input) return;
  focusInput(input);
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  if (start === 0 && end === 0) return;
  if (start !== end) {
    input.setRangeText('', start, end, 'start');
  } else {
    input.setRangeText('', start - 1, start, 'start');
  }
  input.dispatchEvent(new Event('input'));
}

function clearCurrent() {
  const input = getActiveInput();
  if (!input) return;
  input.value = '';
  input.dispatchEvent(new Event('input'));
  focusInput(input);
}

function renderResults() {
  const results = evaluateRows(rows, variableValues());
  const total = calculateTotal(results);
  totalValue.textContent = total.display;
  totalNote.textContent = `${total.validCount} included · ${total.excludedCount} excluded`;
  worksheet.querySelectorAll('.calc-row').forEach((row, index) => {
    const output = row.querySelector('.result');
    const result = results[index];
    output.className = 'result';
    output.textContent = '';
    if (result.state === 'result') {
      output.textContent = result.display;
    } else if (result.state !== 'empty') {
      output.classList.add('status', result.state);
      output.textContent = result.message;
    }
    output.setAttribute('aria-label', result.state === 'result' ? `Result ${result.display}` : result.message ?? 'No result');
  });
}

document.querySelectorAll('[data-insert]').forEach((button) => {
  button.addEventListener('click', () => insertAtCursor(button.dataset.insert));
});
document.querySelector('[data-action="backspace"]').addEventListener('click', backspace);
document.querySelector('[data-action="clear"]').addEventListener('click', clearCurrent);
document.querySelector('#add-variable').addEventListener('click', () => {
  variables.push({ name: '', value: '' });
  renderVariables();
  saveRows();
  const names = variablesBody.querySelectorAll('.variable-name');
  names[names.length - 1].focus();
});

createWorkspace();
renderVariables();
createReferenceButtons();
renderResults();
activeInput = worksheet.querySelector(`[data-row="${activeRow}"] .expression`);
