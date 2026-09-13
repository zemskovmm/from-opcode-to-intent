import { calculateRows, calculateTotal, formatResult } from './calculator.js';
import { deserializeState, serializeState } from './state.js';

const rowCount = 10;
const storageKey = 'instantcalc-demo:terra-APP1-r01:instant-calculator-expressions-v1';
const rowsElement = document.querySelector('#rows');
const keypadElement = document.querySelector('#keypad');
const pickerElement = document.querySelector('#reference-picker');
const optionsElement = document.querySelector('#reference-options');
const variableRowsElement = document.querySelector('#variable-rows');

let { expressions, activeIndex, variables } = loadState();

function loadState() {
  return deserializeState(localStorage.getItem(storageKey));
}

function saveExpressions() {
  localStorage.setItem(storageKey, serializeState(expressions, activeIndex, variables));
}

function variableValues() {
  const names = variables.map((variable) => variable.name.trim());
  return Object.fromEntries(variables.flatMap((variable, index) => {
    const name = names[index];
    const value = Number(variable.value);
    const unique = names.filter((candidate) => candidate === name).length === 1;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || !unique || !variable.value.trim() || !Number.isFinite(value)) {
      return [];
    }
    return [[name, value]];
  }));
}

function renderVariables() {
  variableRowsElement.replaceChildren(...variables.map((variable, index) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const valueCell = document.createElement('td');
    const removeCell = document.createElement('td');
    const name = document.createElement('input');
    const value = document.createElement('input');
    const remove = document.createElement('button');

    name.type = 'text';
    name.value = variable.name;
    name.placeholder = 'e.g. rate';
    name.autocomplete = 'off';
    name.spellcheck = false;
    name.dataset.field = 'name';
    name.setAttribute('aria-label', `Variable ${index + 1} name`);
    value.type = 'text';
    value.value = variable.value;
    value.placeholder = '0';
    value.inputMode = 'decimal';
    value.autocomplete = 'off';
    value.dataset.field = 'value';
    value.setAttribute('aria-label', `Variable ${index + 1} value`);
    name.addEventListener('input', () => {
      variables[index].name = name.value;
      saveExpressions();
      updateResults();
    });
    value.addEventListener('input', () => {
      variables[index].value = value.value;
      saveExpressions();
      updateResults();
    });
    remove.type = 'button';
    remove.className = 'remove-variable';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove variable ${index + 1}`);
    remove.addEventListener('click', () => {
      variables.splice(index, 1);
      saveExpressions();
      renderVariables();
      updateResults();
    });
    nameCell.append(name);
    valueCell.append(value);
    removeCell.append(remove);
    row.append(nameCell, valueCell, removeCell);
    return row;
  }));
}

function renderRows() {
  rowsElement.replaceChildren(...expressions.map((expression, index) => {
    const row = document.createElement('div');
    row.className = 'calculation-row';
    row.dataset.index = index;

    const number = document.createElement('span');
    number.className = 'line-number';
    number.textContent = index + 1;

    const input = document.createElement('input');
    input.className = 'expression';
    input.type = 'text';
    input.inputMode = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.value = expression;
    input.placeholder = index === 0 ? 'Start calculating…' : 'Enter an expression';
    input.setAttribute('aria-label', `Expression for line ${index + 1}`);
    input.addEventListener('focus', () => selectRow(index));
    input.addEventListener('input', () => {
      expressions[index] = input.value;
      saveExpressions();
      updateResults();
    });

    const output = document.createElement('output');
    output.className = 'result';
    output.setAttribute('aria-live', 'polite');

    row.append(number, input, output);
    return row;
  }));
}

function updateResults() {
  const results = calculateRows(expressions, variableValues());
  document.querySelectorAll('.calculation-row').forEach((row, index) => {
    const result = results[index];
    const output = row.querySelector('.result');
    row.classList.toggle('is-active', index === activeIndex);
    row.classList.toggle('has-status', result.status !== 'ok' && result.status !== 'empty');
    if (result.status === 'ok') {
      output.textContent = formatResult(result.value);
      output.className = 'result';
    } else if (result.status === 'empty') {
      output.textContent = '';
      output.className = 'result';
    } else {
      output.textContent = result.message;
      output.className = 'result status';
    }
  });
  const total = calculateTotal(results);
  document.querySelector('#total-result').textContent = formatResult(total.value);
  document.querySelector('#total-detail').textContent = `${total.included} line${total.included === 1 ? '' : 's'} included · ${total.excluded} excluded`;
}

function selectRow(index) {
  activeIndex = index;
  saveExpressions();
  pickerElement.hidden = true;
  updateResults();
}

function activeInput() {
  return document.querySelectorAll('.expression')[activeIndex];
}

function insertText(text) {
  const input = activeInput();
  input.focus();
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.setRangeText(text, start, end, 'end');
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function backspace() {
  const input = activeInput();
  input.focus();
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  if (start !== end) input.setRangeText('', start, end, 'end');
  else if (start > 0) input.setRangeText('', start - 1, start, 'end');
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function renderKeypad() {
  const keys = [
    ['(', '('], [')', ')'], ['√', 'sqrt('], ['%', '%'],
    ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '/'],
    ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*'],
    ['1', '1'], ['2', '2'], ['3', '3'], ['−', '-'],
    ['.', '.'], ['0', '0'], ['^', '^'], ['+', '+'],
  ];
  keys.forEach(([label, value]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.value = value;
    button.addEventListener('click', () => insertText(value));
    keypadElement.append(button);
  });
  const reference = document.createElement('button');
  reference.type = 'button';
  reference.className = 'reference-key';
  reference.textContent = '$ Ref';
  reference.addEventListener('click', toggleReferences);
  const erase = document.createElement('button');
  erase.type = 'button';
  erase.className = 'erase-key';
  erase.setAttribute('aria-label', 'Backspace');
  erase.textContent = '⌫';
  erase.addEventListener('click', backspace);
  keypadElement.append(reference, erase);
}

function toggleReferences() {
  const available = Array.from({ length: activeIndex }, (_, index) => index + 1);
  optionsElement.replaceChildren();
  if (!available.length) {
    const hint = document.createElement('span');
    hint.className = 'no-references';
    hint.textContent = 'References use earlier lines.';
    optionsElement.append(hint);
  } else {
    available.forEach((line) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `$${line}`;
      button.addEventListener('click', () => {
        insertText(`$${line}`);
        pickerElement.hidden = true;
      });
      optionsElement.append(button);
    });
  }
  pickerElement.hidden = !pickerElement.hidden;
}

document.querySelector('#clear-all').addEventListener('click', () => {
  if (confirm('Clear all ten saved calculations?')) {
    expressions = Array(rowCount).fill('');
    activeIndex = 0;
    saveExpressions();
    renderRows();
    updateResults();
    document.querySelector('.expression').focus();
  }
});

document.querySelector('#add-variable').addEventListener('click', () => {
  variables.push({ name: '', value: '' });
  saveExpressions();
  renderVariables();
  variableRowsElement.querySelector('tr:last-child input').focus();
});

renderRows();
renderVariables();
renderKeypad();
updateResults();
activeInput().focus();
