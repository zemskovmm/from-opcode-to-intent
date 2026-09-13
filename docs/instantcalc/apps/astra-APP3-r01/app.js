import { calculateWorksheet, formatResult, validateVariables, totalWorksheet } from './calculator.js';
import { ROW_COUNT, loadWorksheet, saveWorksheet, editExpression } from './worksheet.js';

const $ = (selector) => document.querySelector(selector);
let storage;
try { storage = window.localStorage; } catch { /* Calculation still works without storage. */ }
const state = loadWorksheet(storage);
const rows = [];
const textMeasure = document.createElement('canvas').getContext('2d');
let results;
let total;
let variableInput;

for (let index = 0; index < ROW_COUNT; index++) {
  const row = document.createElement('div');
  row.className = 'calculation-row';
  row.innerHTML = `<button class="line-number" aria-label="Edit line ${index + 1}">${index + 1}</button>
    <input class="expression" id="line-${index + 1}" type="text" inputmode="none" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Line ${index + 1} expression">
    <div class="result-area"><output class="result" id="result-${index + 1}" for="line-${index + 1}" aria-label="Line ${index + 1} result"></output><button class="indicator" hidden></button></div>`;
  const input = row.querySelector('input');
  input.value = state.expressions[index];
  input.setAttribute('aria-describedby', `result-${index + 1}`);
  if (index === 0) input.placeholder = 'Start with a calculation…';
  input.addEventListener('focus', () => activate(index, false));
  input.addEventListener('input', () => {
    state.expressions[index] = input.value;
    update();
    persist();
  });
  input.addEventListener('keydown', (event) => {
    if (['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      activate(state.activeRow + (event.key === 'ArrowUp' ? -1 : 1));
    }
  });
  row.querySelector('.line-number').addEventListener('click', () => activate(index));
  row.addEventListener('click', (event) => {
    if (event.target === row || event.target.closest('.result-area')) activate(index);
  });
  $('#worksheet').append(row);
  rows.push({ row, input, output: row.querySelector('output'), indicator: row.querySelector('.indicator') });
}

function persist() {
  const saved = saveWorksheet(storage, state);
  $('#save-state').classList.toggle('unsaved', !saved);
  $('#save-text').textContent = saved ? 'Saved on this device' : 'Unable to save on this device';
}

function showContext() {
  const current = results[state.activeRow];
  $('#active-line').textContent = state.activeRow + 1;
  $('#line-hint').textContent = current.message ?? (current.status === 'ok'
    ? 'Updates as you type' : 'Type an expression or use the keypad');
  for (const button of document.querySelectorAll('[data-action="previous"]')) button.disabled = state.activeRow === 0;
  for (const button of document.querySelectorAll('[data-action="next"]')) button.disabled = state.activeRow === ROW_COUNT - 1;
}

function update() {
  results = calculateWorksheet(state.expressions, state.variables);
  results.forEach((result, index) => {
    const { output, indicator } = rows[index];
    output.textContent = result.status === 'ok' ? formatResult(result.value) : '';
    output.title = output.textContent;
    indicator.hidden = result.status === 'empty' || result.status === 'ok';
    indicator.textContent = result.status === 'incomplete' ? '…' : result.status === 'blocked' ? '↗' : 'ⓘ';
    indicator.dataset.status = result.status;
    indicator.title = result.message ?? '';
    indicator.setAttribute('aria-label', `Line ${index + 1}: ${result.message ?? ''}`);
  });
  total = totalWorksheet(results);
  $('#total-result').textContent = total.status === 'ok' ? formatResult(total.value) : total.message;
  $('#total-result').title = $('#total-result').textContent;
  $('#total-details').textContent = `${total.included.length} included · ${total.excluded.length} excluded`;
  $('#variable-count').textContent = state.variables.length;
  updateVariableFeedback();
  showContext();
}

function keepVisible() {
  rows[state.activeRow].row.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
}

function activate(index, focus = true) {
  state.activeRow = Math.max(0, Math.min(ROW_COUNT - 1, index));
  rows.forEach(({ row }, i) => row.classList.toggle('active', i === state.activeRow));
  if (focus) rows[state.activeRow].input.focus({ preventScroll: true });
  showContext();
  keepVisible();
  persist();
}

function insert(insertion) {
  const input = rows[state.activeRow].input;
  const edited = editExpression(input.value, input.selectionStart, input.selectionEnd, insertion);
  input.value = edited.text;
  state.expressions[state.activeRow] = edited.text;
  input.focus({ preventScroll: true });
  input.setSelectionRange(edited.cursor, edited.cursor);
  keepCaretVisible(input);
  update();
  persist();
  keepVisible();
}

function keepCaretVisible(input) {
  if (!textMeasure) return;
  textMeasure.font = getComputedStyle(input).font;
  const offset = textMeasure.measureText(input.value.slice(0, input.selectionStart)).width;
  if (offset < input.scrollLeft || offset > input.scrollLeft + input.clientWidth - 24) {
    input.scrollLeft = Math.max(0, offset - input.clientWidth + 24);
  }
}

$('#keypad').addEventListener('pointerdown', (event) => {
  if (event.target.closest('button')) event.preventDefault();
});
$('#keypad').addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.insert !== undefined) return insert(button.dataset.insert);
  const action = button.dataset.action;
  const input = rows[state.activeRow].input;
  if (action === 'backspace') insert('backspace');
  if (action === 'clear') {
    input.setSelectionRange(0, input.value.length);
    insert('');
  }
  if (action === 'previous' || action === 'next') activate(state.activeRow + (action === 'next' ? 1 : -1));
  if (action === 'left' || action === 'right') {
    const position = action === 'left'
      ? (input.selectionStart === input.selectionEnd ? input.selectionStart - 1 : input.selectionStart)
      : (input.selectionStart === input.selectionEnd ? input.selectionEnd + 1 : input.selectionEnd);
    input.focus({ preventScroll: true });
    const cursor = Math.max(0, Math.min(input.value.length, position));
    input.setSelectionRange(cursor, cursor);
    keepCaretVisible(input);
    keepVisible();
  }
});

$('#reference-open').addEventListener('click', () => {
  const list = $('#reference-list');
  list.replaceChildren();
  for (let index = 0; index < state.activeRow; index++) {
    const choice = document.createElement('button');
    choice.className = 'reference-option';
    const result = results[index];
    const label = result.status === 'ok' ? formatResult(result.value) : result.status === 'empty' ? 'Empty' : result.message;
    for (const [className, text] of [['ref-number', `$${index + 1}`], ['ref-expression', state.expressions[index] || 'Empty line'], ['ref-result', label]]) {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = text;
      choice.append(span);
    }
    choice.title = `Line ${index + 1}: ${label}`;
    choice.addEventListener('click', () => {
      $('#reference-dialog').close();
      insert(`$${index + 1}`);
    });
    list.append(choice);
  }
  if (state.activeRow === 0) {
    const message = document.createElement('p');
    message.className = 'reference-empty';
    message.textContent = 'Line 1 is your starting point. Select line 2 or below to reference an earlier calculation.';
    list.append(message);
  }
  $('#reference-dialog').showModal();
});

$('#clear-open').addEventListener('click', () => $('#clear-dialog').showModal());
$('#help-open').addEventListener('click', () => $('#help-dialog').showModal());
$('#total-details').addEventListener('click', () => {
  $('#total-summary').textContent = `${total.included.length} of 10 lines included. ${total.excluded.length} excluded.${total.message ? ` ${total.message}.` : ''}`;
  $('#total-exclusions').replaceChildren();
  for (const exclusion of total.excluded) {
    const item = document.createElement('li');
    item.textContent = `Line ${exclusion.line}: ${exclusion.message}`;
    $('#total-exclusions').append(item);
  }
  $('#total-dialog').showModal();
});

function updateVariableFeedback() {
  const validation = validateVariables(state.variables);
  $('#variable-table').querySelectorAll('tr').forEach((row, index) => {
    const result = validation[index];
    row.querySelector('.variable-message').textContent = result.message ?? '';
    row.querySelector('[data-use]').disabled = result.status !== 'ok';
  });
}

function renderVariables() {
  variableInput = undefined;
  $('#variable-keys').replaceChildren();
  $('#variable-target').textContent = 'Select a field to edit';
  $('#variable-table').replaceChildren();
  $('#variables-empty').hidden = state.variables.length > 0;
  state.variables.forEach((variable, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td><input data-field="name" aria-label="Variable ${index + 1} name" aria-describedby="variable-message-${index}" inputmode="none" autocomplete="off" autocapitalize="off" spellcheck="false"><span class="variable-message" id="variable-message-${index}"></span></td>
      <td><input data-field="value" aria-label="Variable ${index + 1} value" aria-describedby="variable-message-${index}" inputmode="none" autocomplete="off" spellcheck="false"></td>
      <td><button class="variable-action" data-use>Use</button><button class="variable-action" data-remove aria-label="Remove variable ${index + 1}">×</button></td>`;
    for (const input of row.querySelectorAll('input')) {
      input.value = variable[input.dataset.field];
      input.addEventListener('focus', () => {
        variableInput = input;
        $('#variable-target').textContent = `Editing variable ${index + 1} ${input.dataset.field}`;
        renderVariableKeys(input.dataset.field);
      });
      input.addEventListener('input', () => {
        variable[input.dataset.field] = input.value;
        update();
        persist();
      });
    }
    row.querySelector('[data-use]').addEventListener('click', () => {
      $('#variables-dialog').close();
      insert(`@${variable.name.trim()}`);
    });
    row.querySelector('[data-remove]').addEventListener('click', () => {
      state.variables.splice(index, 1);
      renderVariables();
      update();
      persist();
      $('#variable-add').focus();
    });
    $('#variable-table').append(row);
  });
  updateVariableFeedback();
}

function renderVariableKeys(field) {
  $('#variable-keys').replaceChildren();
  const characters = field === 'name' ? 'abcdefghijklmnopqrstuvwxyz_0123456789' : '789456123-0.';
  const keys = [...characters].map(character => [character, character]);
  keys.push(['left', '←'], ['right', '→'], ['backspace', '⌫'], ['clear', 'Clear']);
  for (const [key, label] of keys) {
    const button = document.createElement('button');
    button.dataset.key = key;
    button.textContent = label;
    button.setAttribute('aria-label', ({ left: 'Move cursor left', right: 'Move cursor right', backspace: 'Backspace', clear: 'Clear selected variable field' })[key] ?? label);
    $('#variable-keys').append(button);
  }
}

$('#variables-open').addEventListener('click', () => {
  renderVariables();
  $('#variables-dialog').showModal();
});
$('#variable-add').addEventListener('click', () => {
  let number = 1;
  while (state.variables.some(variable => variable.name.trim() === `var${number}`)) number++;
  state.variables.push({ name: `var${number}`, value: '' });
  renderVariables();
  update();
  persist();
  $('#variable-table tr:last-child [data-field="value"]').focus();
});
$('#variable-keys').addEventListener('pointerdown', event => {
  if (event.target.closest('button')) event.preventDefault();
});
$('#variable-keys').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || !variableInput) return;
  const input = variableInput;
  const key = button.dataset.key;
  let cursor;
  if (key === 'left' || key === 'right') {
    cursor = key === 'left' ? input.selectionStart - 1 : input.selectionEnd + 1;
  } else {
    const edit = key === 'clear'
      ? editExpression(input.value, 0, input.value.length, '')
      : editExpression(input.value, input.selectionStart, input.selectionEnd, key);
    input.value = edit.text;
    cursor = edit.cursor;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  input.focus({ preventScroll: true });
  cursor = Math.max(0, Math.min(input.value.length, cursor));
  input.setSelectionRange(cursor, cursor);
  keepCaretVisible(input);
});
document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
$('#clear-confirm').addEventListener('click', () => {
  state.expressions.fill('');
  rows.forEach(({ input }) => { input.value = ''; });
  $('#clear-dialog').close();
  update();
  activate(0);
});
window.addEventListener('resize', keepVisible);
update();
activate(state.activeRow, false);
