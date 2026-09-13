import { calculateTotal, evaluateRows, formatResult, roundToCents } from './evaluator.js';
import { ROW_COUNT, restoreSession, saveSession } from './session.js';

const workspace = document.querySelector('#workspace');
const referenceMenu = document.querySelector('#reference-menu');
const variableMenu = document.querySelector('#variable-menu');
const variablesBody = document.querySelector('#variables-body');
const emptyVariables = document.querySelector('#empty-variables');
const saveStatus = document.querySelector('#save-status');
let activeInput = null;
let activeIndex = 0;

function saveState() {
  const expressions = [...document.querySelectorAll('.expression')].map((input) => input.value);
  const variables = [...document.querySelectorAll('.variable-row')].map((row) => ({
    name: row.querySelector('.variable-name').value,
    value: row.querySelector('.variable-value').value,
  }));
  saveSession(localStorage, expressions, activeIndex, variables);
  saveStatus.textContent = 'Saved locally';
}

function createRows() {
  const session = restoreSession(localStorage);
  activeIndex = session.activeIndex;
  session.expressions.forEach((expression, index) => {
    const row = document.createElement('div');
    row.className = 'calc-row';
    row.innerHTML = `
      <span class="line-number" aria-hidden="true">${index + 1}</span>
      <input class="expression" type="text" value="${escapeHtml(expression)}"
        placeholder="Expression" autocomplete="off" autocapitalize="off" spellcheck="false"
        inputmode="decimal" aria-label="Calculation line ${index + 1}" />
      <output class="result" data-state="empty" aria-live="polite" aria-label="No result"></output>
    `;
    const input = row.querySelector('.expression');
    input.addEventListener('focus', () => setActiveInput(input));
    input.addEventListener('input', () => {
      activeInput = input;
      renderResults();
      saveState();
    });
    workspace.append(row);
  });
  session.variables.forEach((variable) => createVariableRow(variable));
  setActiveInput(document.querySelectorAll('.expression')[activeIndex], false);
  renderResults();
}

function setActiveInput(input, persist = true) {
  if (!input) return;
  activeInput?.closest('.calc-row')?.classList.remove('is-active');
  activeInput = input;
  activeIndex = [...document.querySelectorAll('.expression')].indexOf(input);
  input.closest('.calc-row')?.classList.add('is-active');
  if (persist) saveState();
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function renderResults() {
  const inputs = [...document.querySelectorAll('.expression')];
  const variables = readVariables();
  const results = evaluateRows(inputs.map((input) => input.value), variables);
  results.forEach((result, index) => {
    const output = document.querySelectorAll('.result')[index];
    output.dataset.state = result.state;
    output.textContent = result.state === 'complete' ? formatResult(result.value) : result.state === 'empty' ? '' : result.state === 'incomplete' ? '…' : '—';
    output.setAttribute('aria-label', resultLabel(result.state, result.value));
  });
  renderTotal(calculateTotal(results));
}

function renderTotal(total) {
  const output = document.querySelector('#total-result');
  const note = document.querySelector('#total-note');
  output.textContent = formatResult(total.value);
  output.setAttribute('aria-label', `Total ${formatResult(total.value)}`);
  note.textContent = total.excludedCount ? `${total.excludedCount} excluded` : 'All lines included';
}

function parseVariableValue(text) {
  const value = text.trim();
  if (!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? roundToCents(number) : null;
}

function readVariables() {
  const variables = {};
  document.querySelectorAll('.variable-row').forEach((row) => {
    const nameInput = row.querySelector('.variable-name');
    const valueInput = row.querySelector('.variable-value');
    const status = row.querySelector('.variable-status');
    const name = nameInput.value.trim();
    const value = valueInput.value.trim();
    let state = 'empty';

    if (name || value) {
      const numericValue = parseVariableValue(value);
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name) || numericValue === null) {
        state = value ? 'unavailable' : 'incomplete';
      } else {
        state = 'complete';
        variables[name.toLowerCase()] = numericValue;
      }
    }

    row.dataset.state = state;
    status.textContent = state === 'complete' ? 'Ready' : state === 'incomplete' ? '…' : state === 'unavailable' ? '—' : '';
    status.setAttribute('aria-label', state === 'complete' ? 'Variable ready' : state === 'incomplete' ? 'Variable is incomplete' : state === 'unavailable' ? 'Variable unavailable' : 'Empty variable');
  });
  emptyVariables.hidden = variablesBody.children.length > 0;
  return variables;
}

function createVariableRow(variable = {}) {
  const row = document.createElement('tr');
  row.className = 'variable-row';
  row.innerHTML = `
    <td><input class="variable-name" type="text" value="${escapeHtml(String(variable.name ?? ''))}" placeholder="name" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Variable name" /></td>
    <td><input class="variable-value" type="text" value="${escapeHtml(String(variable.value ?? ''))}" placeholder="0.00" inputmode="decimal" aria-label="Variable value" /></td>
    <td><output class="variable-status" aria-label="Empty variable"></output></td>
    <td><button type="button" class="remove-variable" aria-label="Remove variable">×</button></td>
  `;
  row.querySelectorAll('input').forEach((input) => input.addEventListener('input', () => {
    renderResults();
    saveState();
  }));
  row.querySelector('.remove-variable').addEventListener('click', () => {
    row.remove();
    renderResults();
    saveState();
  });
  variablesBody.append(row);
  readVariables();
  return row;
}

function resultLabel(state, value) {
  if (state === 'complete') return `Result ${formatResult(value)}`;
  if (state === 'empty') return 'No result';
  if (state === 'incomplete') return 'Expression is incomplete';
  return 'Result unavailable';
}

function insertAtCursor(text) {
  if (!activeInput) activeInput = document.querySelector('.expression');
  if (!activeInput) return;
  activeInput.focus();
  const start = activeInput.selectionStart ?? activeInput.value.length;
  const end = activeInput.selectionEnd ?? start;
  activeInput.value = `${activeInput.value.slice(0, start)}${text}${activeInput.value.slice(end)}`;
  const cursor = start + text.length;
  activeInput.setSelectionRange(cursor, cursor);
  activeInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function backspace() {
  if (!activeInput) activeInput = document.querySelector('.expression');
  if (!activeInput) return;
  activeInput.focus();
  const start = activeInput.selectionStart ?? activeInput.value.length;
  const end = activeInput.selectionEnd ?? start;
  const from = start === end ? Math.max(0, start - 1) : start;
  activeInput.value = `${activeInput.value.slice(0, from)}${activeInput.value.slice(end)}`;
  activeInput.setSelectionRange(from, from);
  activeInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function clearActiveRow() {
  if (!activeInput) activeInput = document.querySelector('.expression');
  if (!activeInput) return;
  activeInput.focus();
  activeInput.value = '';
  activeInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function showReferenceMenu() {
  referenceMenu.replaceChildren();
  for (let index = 1; index <= ROW_COUNT; index += 1) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `$${index}`;
    button.addEventListener('click', () => {
      insertAtCursor(`$${index}`);
      referenceMenu.hidden = true;
    });
    referenceMenu.append(button);
  }
  referenceMenu.hidden = !referenceMenu.hidden;
}

function showVariableMenu() {
  variableMenu.replaceChildren();
  const names = [...document.querySelectorAll('.variable-row')]
    .filter((row) => row.dataset.state === 'complete')
    .map((row) => row.querySelector('.variable-name').value.trim());
  if (!names.length) {
    const message = document.createElement('span');
    message.className = 'menu-empty';
    message.textContent = 'Add a ready variable first';
    variableMenu.append(message);
  } else {
    names.forEach((name) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `@${name}`;
      button.addEventListener('click', () => {
        insertAtCursor(`@${name}`);
        variableMenu.hidden = true;
      });
      variableMenu.append(button);
    });
  }
  variableMenu.hidden = !variableMenu.hidden;
}

document.querySelector('.keypad').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.action === 'backspace') return backspace();
  if (button.dataset.action === 'clear') return clearActiveRow();
  if (button.dataset.action === 'references') return showReferenceMenu();
  insertAtCursor(button.dataset.value);
});

document.querySelector('.variable-key').addEventListener('click', showVariableMenu);

document.querySelector('#add-variable').addEventListener('click', () => {
  const row = createVariableRow();
  renderResults();
  saveState();
  row.querySelector('.variable-name').focus();
});

workspace.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    const inputs = [...document.querySelectorAll('.expression')];
    const current = inputs.indexOf(event.target);
    inputs[Math.min(inputs.length - 1, current + (event.shiftKey ? -1 : 1))]?.focus();
  }
});

createRows();
