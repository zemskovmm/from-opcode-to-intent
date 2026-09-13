import { buildVariableMap, calculateTotal, evaluateWorkspace } from './calculator.js';
import { readWorkspace, saveWorkspace } from './persistence.js';

const rowList = document.querySelector('#row-list');
const saveState = document.querySelector('#save-state');
const variablesList = document.querySelector('#variables-list');
const addVariableButton = document.querySelector('#add-variable');
const expressions = Array(10).fill('');
const inputs = [];
const variableInputs = [];
let variables = Array.from({ length: 4 }, () => ({ name: '', value: '' }));
let activeRow = null;
let saveTimer;
let totalOutput;
let totalExclusions;

function createVariableRow(index) {
  const row = document.createElement('div');
  row.className = 'variable-row';
  row.setAttribute('role', 'row');
  row.innerHTML = `
    <input class="variable-input variable-name" type="text" autocomplete="off" spellcheck="false" placeholder="e.g. tax" aria-label="Variable ${index + 1} name">
    <input class="variable-input variable-value" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="0" aria-label="Variable ${index + 1} value">
  `;
  const nameInput = row.querySelector('.variable-name');
  const valueInput = row.querySelector('.variable-value');
  variableInputs.push({ nameInput, valueInput });
  [nameInput, valueInput].forEach((input) => input.addEventListener('input', () => {
    variables[index][input === nameInput ? 'name' : 'value'] = input.value;
    render();
    persist();
  }));
  variablesList.append(row);
}

function createVariableRows() {
  variables.forEach((_, index) => createVariableRow(index));
}

function createRows() {
  for (let index = 0; index < 10; index += 1) {
    const row = document.createElement('article');
    row.className = 'calculation-row';
    row.dataset.row = String(index);
    row.innerHTML = `
      <div class="row-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</div>
      <input class="expression-input" type="text" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Expression ${index + 1}" aria-label="Expression for row ${index + 1}">
      <output class="result" aria-live="polite"></output>
    `;
    const input = row.querySelector('input');
    input.dataset.row = String(index);
    inputs.push(input);
    rowList.append(row);

    input.addEventListener('focus', () => setActive(index));
    input.addEventListener('click', () => setActive(index));
    input.addEventListener('input', () => {
      expressions[index] = input.value;
      setActive(index);
      render();
      rememberSelection(index);
      persist();
    });
    input.addEventListener('select', () => { rememberSelection(index); persist(); });
    input.addEventListener('keyup', () => { rememberSelection(index); persist(); });
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const next = Math.min(9, index + 1);
      setActive(next, true);
      inputs[next].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      persist();
    });
  }
  const total = document.createElement('div');
  total.className = 'total-row';
  total.innerHTML = `
    <div class="total-label"><strong>Total</strong><small id="total-exclusions">0 excluded</small></div>
    <output class="total-output" id="total-output" aria-live="polite"></output>
  `;
  totalOutput = total.querySelector('#total-output');
  totalExclusions = total.querySelector('#total-exclusions');
  rowList.append(total);
}

function setActive(index, focus = false, shouldPersist = true) {
  const changed = activeRow !== index;
  activeRow = index;
  inputs.forEach((input, inputIndex) => {
    input.closest('.calculation-row').classList.toggle('active', inputIndex === index);
  });
  if (changed && shouldPersist) persist(true);
  if (focus) inputs[index].focus({ preventScroll: true });
}

function rememberSelection(index) {
  const input = inputs[index];
  input.dataset.selectionStart = String(input.selectionStart ?? input.value.length);
  input.dataset.selectionEnd = String(input.selectionEnd ?? input.value.length);
}

function render() {
  const result = evaluateWorkspace(expressions, buildVariableMap(variables));
  result.forEach((rowResult, index) => {
    const row = inputs[index].closest('.calculation-row');
    const output = row.querySelector('.result');
    output.textContent = rowResult.display || rowResult.status;
    output.classList.toggle('status', Boolean(rowResult.status));
    output.title = rowResult.status || rowResult.display;
    row.dataset.state = rowResult.status ? rowResult.status.toLowerCase().replaceAll(' ', '-') : 'ready';
  });
  const total = calculateTotal(result);
  totalOutput.textContent = total.display || total.status;
  totalOutput.classList.toggle('status', Boolean(total.status));
  totalOutput.title = total.status || total.display;
  totalExclusions.textContent = `${total.excluded} excluded`;
}

function setSavedState(saved) {
  saveState.textContent = saved ? 'Saved locally' : 'Not saved';
  saveState.classList.toggle('unsaved', !saved);
}

function persist(immediate = false) {
  window.clearTimeout(saveTimer);
  const write = () => {
    try {
      const selections = inputs.map((input) => ({
        start: input.selectionStart,
        end: input.selectionEnd,
        scrollLeft: input.scrollLeft
      }));
      saveWorkspace(localStorage, {
        expressions,
        variables,
        activeRow,
        selections,
        scrollTop: rowList.scrollTop
      });
      setSavedState(true);
    } catch {
      setSavedState(false);
    }
  };
  if (immediate) write();
  else saveTimer = window.setTimeout(write, 80);
}

function restore() {
  try {
    const saved = readWorkspace(localStorage);
    if (!saved || !Array.isArray(saved.expressions)) return;
    saved.expressions.slice(0, 10).forEach((value, index) => {
      expressions[index] = typeof value === 'string' ? value : '';
      inputs[index].value = expressions[index];
    });
    if (Array.isArray(saved.variables) && saved.variables.length > 0) {
      variables = saved.variables.map((row) => ({
        name: typeof row?.name === 'string' ? row.name : '',
        value: typeof row?.value === 'string' ? row.value : ''
      }));
      while (variableInputs.length < variables.length) createVariableRow(variableInputs.length);
      variables.forEach((row, index) => {
        variableInputs[index].nameInput.value = row.name;
        variableInputs[index].valueInput.value = row.value;
      });
    }
    if (Number.isInteger(saved.activeRow) && saved.activeRow >= 0 && saved.activeRow < 10) setActive(saved.activeRow, false, false);
    if (Number.isFinite(saved.scrollTop)) rowList.scrollTop = saved.scrollTop;
    if (Array.isArray(saved.selections)) {
      saved.selections.forEach((selection, index) => {
        if (!inputs[index] || !Number.isInteger(selection?.start)) return;
        const end = Number.isInteger(selection.end) ? selection.end : selection.start;
        inputs[index].setSelectionRange(selection.start, end);
        if (Number.isFinite(selection.scrollLeft)) inputs[index].scrollLeft = selection.scrollLeft;
      });
    }
  } catch {
    setSavedState(false);
  }
}

function updateInput(index, value, cursor) {
  expressions[index] = value;
  inputs[index].value = value;
  inputs[index].focus({ preventScroll: true });
  inputs[index].setSelectionRange(cursor, cursor);
  setActive(index);
  render();
  persist();
}

function activeInput() {
  if (activeRow === null) setActive(0);
  return inputs[activeRow];
}

function insertValue(value) {
  const input = activeInput();
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  updateInput(activeRow, `${input.value.slice(0, start)}${value}${input.value.slice(end)}`, start + value.length);
}

function backspace() {
  const input = activeInput();
  let start = input.selectionStart ?? input.value.length;
  let end = input.selectionEnd ?? start;
  if (start === end && start > 0) start -= 1;
  updateInput(activeRow, `${input.value.slice(0, start)}${input.value.slice(end)}`, start);
}

function clearActive() { updateInput(activeRow ?? 0, '', 0); }

function setupKeypad() {
  document.querySelector('.key-grid').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.action === 'clear') clearActive();
    else if (button.dataset.action === 'backspace') backspace();
    else insertValue(button.dataset.value);
  });
}

function setupVariables() {
  addVariableButton.addEventListener('click', () => {
    variables.push({ name: '', value: '' });
    createVariableRow(variables.length - 1);
    variableInputs.at(-1).nameInput.focus();
    render();
    persist();
  });
}

createRows();
createVariableRows();
restore();
render();
setupKeypad();
setupVariables();
