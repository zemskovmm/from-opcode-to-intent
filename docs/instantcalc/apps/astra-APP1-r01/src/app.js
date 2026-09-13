import { calculateRows, formatResult, evaluateVariables, summarizeRows } from './calculator.js';
import { restoreWorkspace, saveWorkspace, editExpression, nextRow, newVariableName, clearCalculations } from './workspace.js';

const $ = selector => document.querySelector(selector);
// Accessing localStorage itself can throw when browser storage is disabled.
const storage = { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) };
let state = restoreWorkspace(storage);
let results;
let referenceTarget = null;
let selection = { start: 0, end: 0 };
let total;
let variableInputs = [];
let selectedVariable = 0;
const rows = Array.from({ length: 10 }, (_, index) => {
  const row = document.createElement('div');
  row.className = 'calc-row';
  row.innerHTML = `<button class="row-number" aria-label="Select line ${index + 1}">${String(index + 1).padStart(2, '0')}</button><input type="text" inputmode="none" maxlength="500" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Expression on line ${index + 1}" aria-describedby="result-${index}" placeholder="${index === 0 ? 'Start calculating…' : ''}"><button class="row-result" id="result-${index}" aria-label="Line ${index + 1} is empty" disabled></button>`;
  const input = row.querySelector('input');
  const result = row.querySelector('.row-result');
  input.value = state.expressions[index];
  row.addEventListener('click', event => {
    if (referenceTarget !== null) { event.preventDefault(); insertReference(index); }
    else if (!event.target.closest('.row-result')) activate(index);
  });
  row.addEventListener('pointerdown', event => {
    if (referenceTarget !== null) event.preventDefault();
  });
  input.addEventListener('focus', () => {
    if (referenceTarget === null && state.active !== index) { state.active = index; rememberSelection(); render(); persist(); }
  });
  input.addEventListener('input', () => {
    state.expressions[index] = input.value;
    rememberSelection();
    render();
    persist();
  });
  for (const event of ['select', 'keyup', 'click']) input.addEventListener(event, rememberSelection);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); activate(nextRow(index)); }
  });
  result.addEventListener('click', event => {
    if (referenceTarget !== null) return;
    event.stopPropagation();
    const value = results[index];
    if (value.status === 'ok') copyResult(index);
    else { activate(index); announce(value.message); }
  });
  result.addEventListener('focus', () => {
    if (results[index].message) announce(`Line ${index + 1}: ${results[index].message}`);
  });
  $('#rows').append(row);
  return { row, input, result };
});

function announce(message) { $('#feedback').textContent = message; }
function rememberSelection() {
  const input = rows[state.active].input;
  selection = { start: input.selectionStart, end: input.selectionEnd };
}
function persist() {
  const saved = saveWorkspace(storage, state);
  $('#save-status').textContent = saved ? 'Saved on this device' : 'Not saved · browser storage unavailable';
  $('#save-status').classList.toggle('unsaved', !saved);
  $('#variable-save-status').textContent = $('#save-status').textContent;
}
function activate(index, cursor) {
  state.active = index;
  referenceTarget = null;
  const input = rows[index].input;
  input.focus({ preventScroll: true });
  if (cursor !== undefined) input.setSelectionRange(cursor, cursor);
  rememberSelection();
  render();
  input.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  persist();
}
function render() {
  results = calculateRows(state.expressions, state.variables);
  rows.forEach(({ row, input, result }, index) => {
    const value = results[index];
    row.classList.toggle('active', index === state.active);
    row.classList.toggle('reference-eligible', referenceTarget !== null && index < referenceTarget);
    input.readOnly = referenceTarget !== null;
    result.textContent = value.status === 'ok' ? formatResult(value.value) : value.status === 'pending' ? '…' : value.status === 'error' ? 'ⓘ' : '—';
    result.dataset.status = value.status;
    result.disabled = value.status === 'empty';
    const description = value.status === 'ok' ? `Line ${index + 1}: ${formatResult(value.value)}. Click to copy.` : value.message || `Line ${index + 1} is empty.`;
    result.setAttribute('aria-label', description);
    result.title = description;
  });
  total = summarizeRows(results);
  $('#total-value').textContent = total.status === 'ok' ? formatResult(total.value) : 'ⓘ';
  $('#total-value').dataset.status = total.status;
  $('#total-value').setAttribute('aria-label', total.message || `Total: ${formatResult(total.value)}. Click to copy.`);
  $('#total-value').title = total.message || 'Copy total of all valid lines, including subtotals';
  $('#total-summary').textContent = `${total.included} included · ${total.excluded.length} excluded`;
  $('#total-details').textContent = [total.message, ...Object.entries({ empty: 'Blank', pending: 'Unfinished or waiting', error: 'Invalid' }).map(([status, label]) => {
    const lines = total.excluded.filter(row => row.status === status).map(row => row.line);
    return lines.length ? `${label}: ${lines.join(', ')}.` : '';
  })].filter(Boolean).join(' ') || 'All ten calculation lines are included.';
  $('#variable-count').textContent = state.variables.length;
  $('#active-number').textContent = String(state.active + 1).padStart(2, '0');
  $('#advanced-keys').hidden = !state.advanced;
  $('#advanced-toggle').setAttribute('aria-expanded', String(state.advanced));
  $('#advanced-toggle').innerHTML = state.advanced ? 'Less <span aria-hidden="true">−</span>' : 'More <span aria-hidden="true">＋</span>';
  const refButton = $('[data-action="reference"]');
  refButton.setAttribute('aria-pressed', String(referenceTarget !== null));
  refButton.classList.toggle('picking', referenceTarget !== null);
  if (referenceTarget !== null) announce(`Select an earlier line to link. Ref or Esc cancels.`);
  else announce(results[state.active].message || (results[state.active].status === 'ok' ? `Result: ${formatResult(results[state.active].value)}. Tap to copy.` : 'Start with a number. We’ll do the math.'));
}
function insert(text) {
  referenceTarget = null;
  const edit = editExpression(state.expressions[state.active], selection.start, selection.end, text);
  state.expressions[state.active] = edit.expression;
  rows[state.active].input.value = edit.expression;
  activate(state.active, edit.cursor);
}
function insertReference(index) {
  if (index >= referenceTarget) { announce('Choose a line above the one you’re editing.'); return; }
  state.active = referenceTarget;
  insert(`$${index + 1}`);
}
async function copyResult(index) {
  await copyValue(results[index].value, `line ${index + 1}`);
}
async function copyValue(value, source) {
  const display = formatResult(value);
  try { await navigator.clipboard.writeText(display); announce(`Copied ${display} from ${source}.`); }
  catch {
    $('#copy-value').value = display;
    $('#copy-dialog').showModal();
    $('#copy-value').select();
  }
}

function updateVariableFeedback() {
  const validation = evaluateVariables(state.variables).rows;
  variableInputs.forEach(({ row, name, value, issue, insertButton }, index) => {
    const result = validation[index];
    row.classList.toggle('selected-variable', selectedVariable === index);
    name.setAttribute('aria-invalid', String(result.status === 'error' && result.field === 'name'));
    value.setAttribute('aria-invalid', String(result.status === 'error' && result.field === 'value'));
    issue.textContent = result.message || '';
    insertButton.disabled = result.status !== 'ok';
  });
  const variable = state.variables[selectedVariable];
  const result = validation[selectedVariable];
  $('#variable-feedback').textContent = variable ? `Value for ${variable.name || 'unnamed variable'}${result.message ? `: ${result.message}` : ''}` : 'Add a variable to begin.';
}
function variablesChanged() { render(); updateVariableFeedback(); persist(); }
function drawVariables() {
  $('#variable-rows').replaceChildren();
  $('#no-variables').hidden = state.variables.length > 0;
  $('#variable-keypad').hidden = state.variables.length === 0;
  selectedVariable = Math.max(0, Math.min(selectedVariable, state.variables.length - 1));
  variableInputs = state.variables.map((variable, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td><input class="variable-name" type="text" maxlength="32" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Variable ${index + 1} name" aria-describedby="variable-issue-${index}"><small class="variable-issue" id="variable-issue-${index}"></small></td><td><input class="variable-value" type="text" inputmode="none" maxlength="500" autocomplete="off" spellcheck="false" aria-label="Variable ${index + 1} numeric value" aria-describedby="variable-issue-${index}" placeholder="e.g. 12.50"></td><td class="variable-actions"><button class="insert-variable">Insert</button><button class="remove-variable" aria-label="Remove variable ${index + 1}">Remove</button></td>`;
    const name = row.querySelector('.variable-name');
    const value = row.querySelector('.variable-value');
    const insertButton = row.querySelector('.insert-variable');
    name.value = variable.name;
    value.value = variable.value;
    for (const [field, input] of [['name', name], ['value', value]]) {
      input.addEventListener('focus', () => { selectedVariable = index; updateVariableFeedback(); });
      input.addEventListener('input', () => { variable[field] = input.value; variablesChanged(); });
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); if (field === 'name') value.focus(); else insertButton.click(); }
      });
    }
    insertButton.addEventListener('click', () => {
      $('#variables-dialog').close();
      insert(` ${variable.name.trim()} `);
    });
    row.querySelector('.remove-variable').addEventListener('click', () => {
      state.variables.splice(index, 1);
      drawVariables();
      variablesChanged();
      (variableInputs[selectedVariable]?.value || $('#add-variable')).focus();
    });
    $('#variable-rows').append(row);
    return { row, name, value, insertButton, issue: row.querySelector('.variable-issue') };
  });
  updateVariableFeedback();
}
$('#variables-button').addEventListener('click', () => {
  rememberSelection();
  referenceTarget = null;
  render();
  $('#variable-destination').textContent = `Insert into line ${state.active + 1}`;
  drawVariables();
  $('#variables-dialog').showModal();
});
$('#add-variable').addEventListener('click', () => {
  state.variables.push({ name: newVariableName(state.variables), value: '' });
  selectedVariable = state.variables.length - 1;
  drawVariables();
  variablesChanged();
  variableInputs[selectedVariable].value.focus();
});
$('#variable-keypad').addEventListener('pointerdown', event => {
  if (event.target.closest('button')) event.preventDefault();
});
$('#variable-keypad').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || !variableInputs[selectedVariable]) return;
  const input = variableInputs[selectedVariable].value;
  const action = button.dataset.variableAction;
  if (action === 'select') { input.focus(); input.select(); return; }
  const edit = editExpression(input.value, action === 'clear' ? 0 : input.selectionStart, action === 'clear' ? input.value.length : input.selectionEnd, action === 'backspace' ? null : button.dataset.value ?? '');
  input.value = edit.expression;
  state.variables[selectedVariable].value = edit.expression;
  input.focus();
  input.setSelectionRange(edit.cursor, edit.cursor);
  variablesChanged();
});
$('#total-value').addEventListener('click', () => {
  if (total.status === 'ok') copyValue(total.value, 'the total');
  else announce(total.message);
});

$('.keypad').addEventListener('pointerdown', event => {
  if (event.target.closest('button')) event.preventDefault();
});
$('.keypad').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.insert !== undefined) { insert(button.dataset.insert); return; }
  const action = button.dataset.action;
  const input = rows[state.active].input;
  if (action === 'backspace') insert(null);
  if (action === 'next') activate(nextRow(state.active));
  if (action === 'clear') { selection = { start: 0, end: input.value.length }; insert(''); }
  if (action === 'select') { activate(state.active); input.select(); rememberSelection(); }
  if (action === 'left' || action === 'right') {
    const cursor = action === 'left' ? (selection.start !== selection.end ? selection.start : Math.max(0, selection.start - 1)) : (selection.start !== selection.end ? selection.end : Math.min(input.value.length, selection.end + 1));
    activate(state.active, cursor);
  }
  if (action === 'reference') {
    if (state.active === 0) { announce('References use earlier lines. Try Ref on line 2 or below.'); return; }
    referenceTarget = referenceTarget === null ? state.active : null;
    render();
    if (referenceTarget !== null) rows[referenceTarget - 1].row.scrollIntoView({ block: 'nearest' });
  }
});
$('#advanced-toggle').addEventListener('click', () => { state.advanced = !state.advanced; render(); persist(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && referenceTarget !== null) { referenceTarget = null; render(); activate(state.active); }
});
$('#help-button').addEventListener('click', () => $('#help-dialog').showModal());
$('#clear-all').addEventListener('click', () => $('#clear-dialog').showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
$('#confirm-clear').addEventListener('click', () => {
  state = clearCalculations(state);
  rows.forEach(({ input }) => { input.value = ''; });
  $('#clear-dialog').close();
  activate(0, 0);
});
render();
activate(state.active, state.expressions[state.active].length);
