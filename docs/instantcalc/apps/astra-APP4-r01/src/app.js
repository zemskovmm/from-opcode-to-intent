import { calculate, format, summarize, validateVariables } from './calculator.js';
import { Worksheet } from './worksheet.js';

const $ = selector => document.querySelector(selector);
let storage;
try { storage = window.localStorage; } catch { /* Editing remains available. */ }
const sheet = new Worksheet(storage);
const worksheet = $('#worksheet');
const pinned = $('#active-input');
let nativeTyping = false;
let results;
let variableEntries = [];
const editingVariable = () => document.activeElement?.classList.contains('variable-input');

function fitViewport() {
  const viewport = window.visualViewport;
  $('.app').style.height = (nativeTyping || editingVariable()) && viewport?.scale === 1 ? `${viewport.height}px` : '';
}
window.visualViewport?.addEventListener('resize', fitViewport);

const rows = Array.from({ length: 10 }, (_, index) => {
  const element = document.createElement('div');
  element.className = 'row';
  const number = document.createElement('button');
  number.className = 'row-number';
  number.textContent = index + 1;
  const input = document.createElement('input');
  input.className = 'expression';
  input.dataset.row = index;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', `Row ${index + 1} expression`);
  const result = document.createElement('button');
  result.className = 'result';
  result.id = `result-${index}`;
  input.setAttribute('aria-describedby', result.id);
  number.addEventListener('click', () => {
    sheet.select(index);
    render();
    focusEditor();
  });
  result.addEventListener('click', async () => {
    if (results[index].status !== 'ok') return;
    const displayed = format(results[index].value);
    try {
      await navigator.clipboard.writeText(displayed);
      notice(`Copied ${displayed}`);
    } catch { notice('Could not copy. Select the answer and copy it manually.'); }
  });
  element.append(number, input, result);
  worksheet.append(element);
  return { element, number, input, result };
});

function notice(text) { $('#notice').textContent = text; }
function remember(input) {
  sheet.start = input.selectionStart;
  sheet.end = input.selectionEnd;
}
function focusEditor() {
  const { start, end } = sheet;
  pinned.focus({ preventScroll: true });
  pinned.setSelectionRange(start, end);
  sheet.start = start;
  sheet.end = end;
  rows[sheet.active].element.scrollIntoView({ block: 'nearest' });
}

function renderVariables() {
  // Keep existing input elements while typing, preserving native cursor/selection.
  if (variableEntries.length !== sheet.variables.length) {
    $('#variable-entries').replaceChildren();
    variableEntries = sheet.variables.map((_, index) => {
      const row = document.createElement('tr');
      const inputs = ['name', 'value'].map(field => {
        const cell = document.createElement('td');
        const input = document.createElement('input');
        input.className = 'variable-input';
        input.autocomplete = 'off';
        input.autocapitalize = 'off';
        input.spellcheck = false;
        input.setAttribute('aria-label', `${field === 'name' ? 'Name' : 'Value'} for variable ${index + 1}`);
        input.setAttribute('aria-describedby', `variable-feedback-${index}`);
        input.addEventListener('input', () => {
          sheet.editVariable(index, field, input.value);
          render();
        });
        cell.append(input);
        row.append(cell);
        return input;
      });
      const actions = document.createElement('td');
      const buttons = document.createElement('div');
      buttons.className = 'variable-actions';
      const insert = document.createElement('button');
      insert.textContent = 'Insert';
      insert.addEventListener('click', () => {
        sheet.insert(sheet.variables[index].name.trim());
        render();
        focusEditor();
      });
      const remove = document.createElement('button');
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        sheet.removeVariable(index);
        render();
        $('#add-variable').focus({ preventScroll: true });
      });
      buttons.append(insert, remove);
      actions.append(buttons);
      row.append(actions);
      const feedbackRow = document.createElement('tr');
      const feedback = document.createElement('td');
      feedback.colSpan = 3;
      feedback.id = `variable-feedback-${index}`;
      feedback.className = 'variable-feedback';
      feedbackRow.append(feedback);
      $('#variable-entries').append(row, feedbackRow);
      return { inputs, insert, remove, feedback, feedbackRow };
    });
  }
  const checked = validateVariables(sheet.variables);
  variableEntries.forEach(({ inputs, insert, remove, feedback, feedbackRow }, index) => {
    const variable = sheet.variables[index];
    const state = checked[index];
    inputs.forEach((input, field) => {
      const value = field === 0 ? variable.name : variable.value;
      if (input.value !== value) input.value = value;
      input.readOnly = Boolean(sheet.reference);
    });
    insert.disabled = Boolean(sheet.reference) || state.status !== 'ok';
    remove.disabled = Boolean(sheet.reference);
    insert.setAttribute('aria-label', `Insert ${variable.name.trim() || 'variable'} into row ${sheet.active + 1}`);
    remove.setAttribute('aria-label', `Remove variable ${variable.name.trim() || index + 1}`);
    feedback.textContent = state.message ?? '';
    feedbackRow.hidden = state.status === 'ok';
  });
  $('#variable-count').textContent = sheet.variables.length;
  $('#variables-empty').hidden = sheet.variables.length > 0;
  $('#variable-table').hidden = sheet.variables.length === 0;
  $('#add-variable').disabled = Boolean(sheet.reference);
}

function render() {
  fitViewport();
  results = calculate(sheet.rows, sheet.variables);
  renderVariables();
  const total = summarize(results);
  $('#total-value').textContent = total.status === 'ok' ? format(total.value) : total.message;
  $('#total-exclusions').textContent = `${total.included} included · ${total.blank.length} blank skipped`
    + (total.excluded.length ? ` · Excluded rows: ${total.excluded.join(', ')}` : ' · No other exclusions');
  rows.forEach(({ element, number, input, result }, index) => {
    element.classList.toggle('active', index === sheet.active);
    number.setAttribute('aria-label', `${sheet.reference ? 'Use' : 'Select'} row ${index + 1}`);
    number.setAttribute('aria-pressed', String(index === sheet.active));
    if (input.value !== sheet.rows[index]) input.value = sheet.rows[index];
    input.inputMode = nativeTyping ? 'text' : 'none';
    input.placeholder = index === sheet.active ? 'Start calculating…' : '';
    input.readOnly = Boolean(sheet.reference);
    const answer = results[index];
    const valid = answer.status === 'ok';
    result.textContent = valid ? format(answer.value) : answer.status === 'incomplete' ? '…' : answer.message;
    result.className = `result ${valid ? '' : 'feedback'} ${answer.status}`;
    result.title = valid ? 'Copy result' : answer.message;
    result.setAttribute('aria-label', valid ? `Copy row ${index + 1} result: ${format(answer.value)}` : answer.message || 'No result');
    result.setAttribute('aria-disabled', String(!valid));
    result.tabIndex = valid ? 0 : -1;
  });
  if (pinned.value !== sheet.rows[sheet.active]) pinned.value = sheet.rows[sheet.active];
  pinned.inputMode = nativeTyping ? 'text' : 'none';
  pinned.readOnly = Boolean(sheet.reference);
  pinned.placeholder = 'Enter an expression';
  $('#active-label').textContent = `Row ${sheet.active + 1}`;
  pinned.setAttribute('aria-label', `Editing row ${sheet.active + 1} expression`);
  $('#save-state').textContent = sheet.saved ? 'Saved on this device' : 'Unable to save on this device';
  $('#keypad').hidden = nativeTyping || editingVariable() || Boolean(sheet.reference);
  $('#reference-hint').hidden = !sheet.reference;
  worksheet.classList.toggle('picking', Boolean(sheet.reference));
  $('#typing').textContent = nativeTyping || editingVariable() ? 'Use keypad' : 'Type with keyboard';
  $('#typing').setAttribute('aria-pressed', String(nativeTyping || editingVariable()));
  $('#typing').disabled = Boolean(sheet.reference);
  $('#use-row').disabled = Boolean(sheet.reference);
  document.querySelectorAll('[data-action]').forEach(button => {
    button.disabled = Boolean(sheet.reference) || (button.dataset.action === 'up' && sheet.active === 0)
      || (button.dataset.action === 'down' && sheet.active === 9);
  });
}

for (const input of [...rows.map(row => row.input), pinned]) {
  input.addEventListener('focus', () => {
    if (sheet.reference) return;
    if (input !== pinned && sheet.active !== Number(input.dataset.row)) sheet.select(Number(input.dataset.row));
    remember(input);
    render();
  });
  input.addEventListener('input', () => {
    sheet.edit(input.value, input.selectionStart, input.selectionEnd);
    render();
  });
  input.addEventListener('keydown', event => {
    if (sheet.reference) {
      if (event.key === 'Escape') { sheet.cancelReference(); render(); focusEditor(); }
      return;
    }
    if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) {
      event.preventDefault();
      sheet.navigate(event.key === 'ArrowUp' ? -1 : 1);
      render();
      focusEditor();
    }
  });
}
document.addEventListener('selectionchange', () => {
  const input = document.activeElement;
  if (!sheet.reference && (input === pinned || input?.classList.contains('expression'))) remember(input);
});

// Pointer buttons keep the text selection intact; keyboard users can still Tab.
document.querySelectorAll('.controls button').forEach(button => {
  button.addEventListener('pointerdown', event => {
    const input = document.activeElement;
    if (input === pinned || input?.classList.contains('expression')) remember(input);
    event.preventDefault();
  });
});
$('.controls').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  if (button.dataset.insert !== undefined) sheet.insert(button.dataset.insert);
  else if (button.dataset.action) {
    const action = button.dataset.action;
    if (action === 'left' || action === 'right') sheet.move(action === 'left' ? -1 : 1);
    if (action === 'up' || action === 'down') sheet.navigate(action === 'up' ? -1 : 1);
    if (action === 'backspace') sheet.backspace();
    if (action === 'clear') sheet.clearRow();
  } else if (button.id === 'typing') {
    nativeTyping = editingVariable() ? false : !nativeTyping;
    // Refocusing after changing inputMode requests or dismisses the phone keyboard.
    document.activeElement?.blur();
  } else if (button.id === 'use-row') sheet.useRow();
  else if (button.id === 'cancel-reference') sheet.cancelReference();
  else return;
  render();
  if (!sheet.reference) focusEditor();
  else rows[0].number.focus({ preventScroll: true });
});

$('#variables-panel').addEventListener('pointerdown', () => {
  const input = document.activeElement;
  if (input === pinned || input?.classList.contains('expression')) remember(input);
});
$('#add-variable').addEventListener('click', () => {
  sheet.addVariable();
  render();
  variableEntries.at(-1).inputs[0].focus();
});
// Variable fields intentionally use the native keyboard. Recompute control
// visibility when focus returns to the worksheet or another control.
document.addEventListener('focusin', render);
$('#variables-panel').addEventListener('toggle', render);

$('#clear-sheet').addEventListener('click', () => $('#clear-dialog').showModal());
$('#cancel-clear').addEventListener('click', () => $('#clear-dialog').close());
$('#confirm-clear').addEventListener('click', () => {
  sheet.clearAll(true);
  $('#clear-dialog').close();
  render();
  focusEditor();
  notice('Worksheet cleared. Ready for a fresh start.');
});
render();
