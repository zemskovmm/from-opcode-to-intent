import { Worksheet, editText } from './worksheet.js';
import { formatValue, evaluateVariables, totalResults } from './calculator.js';

const $ = selector => document.querySelector(selector);
let storage;
try { storage = window.localStorage; } catch { /* Worksheet reports unavailable saving. */ }
const sheet = new Worksheet(storage);
const inputs = [];
const rowElements = [];
let toastTimer;
let variableValueInput;

function notify(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3500);
}

function focusRow(index = sheet.active, cursor) {
  sheet.select(index);
  const input = inputs[sheet.active];
  input.focus({ preventScroll: true });
  if (cursor !== undefined) input.setSelectionRange(cursor, cursor);
  input.closest('.calc-row').scrollIntoView({ block: 'nearest', inline: 'nearest' });
  render();
}

function render() {
  const results = sheet.results;
  rowElements.forEach((row, index) => {
    const result = results[index];
    row.classList.toggle('active', index === sheet.active);
    const output = row.querySelector('.row-result');
    const copy = row.querySelector('.copy-button');
    copy.hidden = result.status !== 'valid';
    inputs[index].setAttribute('aria-invalid', result.status === 'error' ? 'true' : 'false');
    const signature = result.status === 'valid' ? formatValue(result.value) : `${result.status}:${result.message ?? ''}`;
    if (output.dataset.signature === signature) return;
    output.dataset.signature = signature;
    output.replaceChildren();
    if (result.status === 'valid') {
      const value = document.createElement('span');
      value.className = 'result-value';
      value.textContent = formatValue(result.value);
      value.title = value.textContent;
      output.append(value);
    } else if (result.status !== 'empty') {
      const indicator = document.createElement('button');
      indicator.className = `state-button ${result.status}`;
      indicator.textContent = result.status === 'incomplete' ? '…' : result.status === 'waiting' ? result.message : 'ⓘ';
      indicator.title = result.message;
      indicator.setAttribute('aria-label', `Row ${index + 1}: ${result.message}`);
      indicator.addEventListener('click', () => notify(result.message));
      output.append(indicator);
    }
  });
  $('#active-label').textContent = `LINE ${String(sheet.active + 1).padStart(2, '0')}`;
  $('[data-action="reference"]').disabled = sheet.active === 0;
  $('#save-status').replaceChildren();
  const dot = document.createElement('span');
  dot.className = 'save-dot';
  $('#save-status').append(dot, sheet.saved ? 'Saved on this device' : 'Saving unavailable · this session only');
  $('#variable-count').textContent = sheet.variables.length;
  const total = totalResults(results);
  const totalText = total.status === 'valid' ? formatValue(total.value) : 'Total too large';
  if ($('#total-value').textContent !== totalText) $('#total-value').textContent = totalText;
  $('#total-details').textContent = `${total.included} included · ${total.excluded.length} excluded`;
  $('#total-value').title = total.status === 'valid' ? totalText : total.message;
  if ($('#variables-dialog').open) updateVariableFeedback();
}

sheet.rows.forEach((expression, index) => {
  const row = document.createElement('div');
  row.className = 'calc-row';
  const number = document.createElement('label');
  number.className = 'row-number';
  number.htmlFor = `expression-${index}`;
  number.textContent = String(index + 1).padStart(2, '0');
  const input = document.createElement('input');
  input.className = 'expression';
  input.id = number.htmlFor;
  input.type = 'text';
  input.inputMode = 'none';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('aria-label', `Row ${index + 1} expression`);
  input.setAttribute('aria-describedby', `result-${index}`);
  input.maxLength = 1000;
  input.value = expression;
  input.placeholder = index === 0 ? 'Start typing a calculation…' : '';
  input.addEventListener('focus', () => {
    sheet.select(index);
    render();
    row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
  input.addEventListener('input', () => { sheet.setRow(index, input.value); render(); });
  input.addEventListener('keydown', event => {
    if (['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      focusRow(index + (event.key === 'ArrowUp' ? -1 : 1));
    }
  });
  const output = document.createElement('div');
  output.id = `result-${index}`;
  output.className = 'row-result';
  output.setAttribute('aria-live', 'polite');
  output.setAttribute('aria-atomic', 'true');
  const copy = document.createElement('button');
  copy.className = 'copy-button';
  copy.setAttribute('aria-label', `Copy row ${index + 1} result`);
  copy.title = 'Copy result';
  copy.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-copy"/></svg>';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(formatValue(sheet.results[index].value).replace('≈ ', ''));
      notify(`Row ${index + 1} result copied`);
    } catch { notify('Could not copy. Select the result and copy it manually.'); }
  });
  row.append(number, input, output, copy);
  $('#rows').append(row);
  inputs.push(input);
  rowElements.push(row);
});

function insert(value) {
  const input = inputs[sheet.active];
  const edited = editText(input.value, input.selectionStart, input.selectionEnd, value);
  if (edited.text.length > 1000) { notify('Keep expressions under 1,000 characters'); return; }
  sheet.setRow(sheet.active, edited.text);
  input.value = edited.text;
  focusRow(sheet.active, edited.cursor);
}

function showReferences() {
  const container = $('#reference-options');
  container.replaceChildren();
  sheet.results.slice(0, sheet.active).forEach((result, index) => {
    const button = document.createElement('button');
    const label = document.createElement('span');
    label.textContent = `$${index + 1}`;
    const value = document.createElement('span');
    value.textContent = result.status === 'valid' ? formatValue(result.value) : result.status === 'empty' ? 'Empty line' : 'Awaiting a result';
    button.append(label, value);
    button.addEventListener('click', () => {
      $('#reference-dialog').close();
      insert(`$${index + 1}`);
    });
    container.append(button);
  });
  $('#reference-dialog').showModal();
}

for (const panel of [$('#key-grid'), $('#editing-tools')]) {
  // Keep the expression's native caret/selection when a pointer presses a key.
  panel.addEventListener('pointerdown', event => { if (event.target.closest('button')) event.preventDefault(); });
  panel.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.insert !== undefined) { insert(button.dataset.insert); return; }
    const input = inputs[sheet.active];
    switch (button.dataset.action) {
      case 'backspace': insert('backspace'); break;
      case 'clear': sheet.setRow(sheet.active, ''); input.value = ''; focusRow(sheet.active, 0); break;
      case 'left': focusRow(sheet.active, input.selectionStart !== input.selectionEnd ? input.selectionStart : Math.max(0, input.selectionStart - 1)); break;
      case 'right': focusRow(sheet.active, input.selectionStart !== input.selectionEnd ? input.selectionEnd : Math.min(input.value.length, input.selectionEnd + 1)); break;
      case 'select': focusRow(); input.select(); break;
      case 'next': sheet.next(); focusRow(); break;
      case 'reference': showReferences(); break;
    }
  });
}

$('#clear-all').addEventListener('click', () => $('#clear-dialog').showModal());
$('#confirm-clear').addEventListener('click', () => {
  sheet.clear();
  inputs.forEach(input => { input.value = ''; });
  $('#clear-dialog').close();
  focusRow(0, 0);
  notify('Worksheet cleared');
});
$('#help-button').addEventListener('click', () => $('#help-dialog').showModal());

function updateVariableFeedback() {
  const { results } = evaluateVariables(sheet.variables);
  $('#variable-rows').querySelectorAll('tr').forEach((row, index) => {
    const result = results[index];
    for (const field of ['name', 'value']) {
      const message = result.field === field ? result.message : '';
      row.querySelector(`[data-error="${field}"]`).textContent = message;
      row.querySelector(`[data-field="${field}"]`).setAttribute('aria-invalid', String(Boolean(message)));
    }
    row.querySelector('.use-variable').disabled = result.status !== 'valid';
  });
  $('#variable-save-status').textContent = sheet.saved ? 'Saved on this device' : 'Saving unavailable';
  $('#variable-keypad-label').textContent = variableValueInput ? `Editing ${sheet.variables[Number(variableValueInput.dataset.index)]?.name || 'unnamed variable'} value` : 'Select a value to use the keypad.';
  $('#variable-keypad').querySelectorAll('button').forEach(button => { button.disabled = !variableValueInput; });
}

function buildVariableTable() {
  variableValueInput = undefined;
  $('#variable-rows').replaceChildren();
  $('#no-variables').hidden = sheet.variables.length !== 0;
  sheet.variables.forEach((variable, index) => {
    const row = document.createElement('tr');
    for (const field of ['name', 'value']) {
      const cell = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'text';
      input.value = variable[field];
      input.dataset.field = field;
      input.dataset.index = index;
      input.maxLength = field === 'name' ? 32 : 1000;
      input.inputMode = field === 'name' ? 'text' : 'none';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('aria-label', `Variable ${index + 1} ${field}`);
      input.setAttribute('aria-describedby', `variable-${index}-${field}-error`);
      input.addEventListener('focus', () => {
        variableValueInput = field === 'value' ? input : undefined;
        updateVariableFeedback();
      });
      input.addEventListener('input', () => { sheet.setVariable(index, field, input.value); render(); });
      const error = document.createElement('span');
      error.id = `variable-${index}-${field}-error`;
      error.dataset.error = field;
      error.className = 'variable-error';
      cell.append(input, error);
      row.append(cell);
    }
    const actions = document.createElement('td');
    const use = document.createElement('button');
    use.className = 'use-variable';
    use.textContent = 'Use';
    use.setAttribute('aria-label', `Insert variable ${index + 1} into the active line`);
    use.addEventListener('click', () => {
      $('#variables-dialog').close();
      insert(sheet.variables[index].name);
    });
    const remove = document.createElement('button');
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove variable ${index + 1}`);
    remove.addEventListener('click', () => {
      sheet.removeVariable(index);
      buildVariableTable();
      render();
      $('#add-variable').focus();
    });
    actions.append(use, remove);
    row.append(actions);
    $('#variable-rows').append(row);
  });
  updateVariableFeedback();
}

$('#variables-button').addEventListener('click', () => {
  buildVariableTable();
  $('#variables-dialog').showModal();
});
$('#add-variable').addEventListener('click', () => {
  sheet.addVariable();
  buildVariableTable();
  render();
  const input = $('#variable-rows').lastElementChild.querySelector('[data-field="value"]');
  input.focus();
  input.select();
});

// Generated names (v1, v2, …) and this keypad allow mouse-only variable creation.
for (const [key, label] of [['7'], ['8'], ['9'], ['backspace', '⌫'], ['4'], ['5'], ['6'], ['clear', 'C'], ['1'], ['2'], ['3'], ['-', '−'], ['0'], ['.'], ['left', '←'], ['right', '→']]) {
  const button = document.createElement('button');
  button.textContent = label || key;
  button.setAttribute('aria-label', ({ backspace: 'Backspace value', clear: 'Clear value', left: 'Move value cursor left', right: 'Move value cursor right', '-': 'Negative sign', '.': 'Decimal point' })[key] || key);
  button.addEventListener('pointerdown', event => event.preventDefault());
  button.addEventListener('click', () => {
    const input = variableValueInput;
    if (!input) return;
    let cursor;
    if (key === 'left' || key === 'right') {
      cursor = key === 'left' ? Math.max(0, input.selectionStart - 1) : Math.min(input.value.length, input.selectionEnd + 1);
    } else {
      const edited = key === 'clear' ? { text: '', cursor: 0 } : editText(input.value, input.selectionStart, input.selectionEnd, key);
      if (edited.text.length > 1000) return;
      sheet.setVariable(Number(input.dataset.index), 'value', edited.text);
      input.value = edited.text;
      cursor = edited.cursor;
    }
    input.focus({ preventScroll: true });
    input.setSelectionRange(cursor, cursor);
    render();
  });
  $('#variable-keypad').append(button);
}

$('#total-details').addEventListener('click', () => {
  const results = sheet.results;
  const total = totalResults(results);
  $('#total-summary').textContent = `${total.included} lines included. ${total.excluded.length} lines excluded.${total.status === 'error' ? ` ${total.message}.` : ''}`;
  $('#total-exclusions').replaceChildren();
  for (const number of total.excluded) {
    const item = document.createElement('li');
    item.textContent = `Line ${number}: ${results[number - 1].message || 'Blank'}`;
    $('#total-exclusions').append(item);
  }
  $('#total-dialog').showModal();
});
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
render();
// Restore the active line's position without opening or focusing a keyboard on load.
rowElements[sheet.active].scrollIntoView({ block: 'nearest', inline: 'nearest' });
