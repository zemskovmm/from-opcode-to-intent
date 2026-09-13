import { calculateTotal, evaluateVariables, evaluateWorksheet, formatResult } from './calculator.js';
import {
  backspaceAtSelection,
  insertAtSelection,
  loadActiveRow,
  loadExpressions,
  loadVariables,
  saveActiveRow,
  saveExpressions,
  saveVariables,
} from './worksheet-state.js';

const worksheet = document.querySelector('#worksheet');
const keypad = document.querySelector('#keypad');
const activeLineLabel = document.querySelector('#active-line-label');
const referencePanel = document.querySelector('#reference-panel');
const referenceOptions = document.querySelector('#reference-options');
const referenceHeading = referencePanel.querySelector('.reference-heading strong');
const variableRows = document.querySelector('#variable-rows');
const totalValue = document.querySelector('#total-value');
const totalDetail = document.querySelector('#total-detail');
const expressions = loadExpressions(localStorage);
const variables = loadVariables(localStorage);
const inputs = [];
const outputs = [];
let activeRow = loadActiveRow(localStorage);
let selection = { start: expressions[activeRow].length, end: expressions[activeRow].length };
let evaluations = [];
let variableEvaluation = { rows: [], values: new Map() };

function createRows() {
  expressions.forEach((expression, index) => {
    const row = document.createElement('div');
    row.className = 'calculation-row';
    row.dataset.row = String(index);

    const number = document.createElement('span');
    number.className = 'line-number';
    number.textContent = String(index + 1).padStart(2, '0');

    const input = document.createElement('input');
    input.className = 'expression-input';
    input.value = expression;
    input.type = 'text';
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-label', `Expression on line ${index + 1}`);
    input.placeholder = index === 0 ? 'Type a calculation…' : '';

    const output = document.createElement('output');
    output.className = 'result-output';
    output.setAttribute('aria-label', `Result on line ${index + 1}`);
    output.setAttribute('aria-live', 'polite');

    row.append(number, input, output);
    worksheet.append(row);
    inputs.push(input);
    outputs.push(output);

    input.addEventListener('focus', () => setActiveRow(index));
    for (const eventName of ['click', 'keyup', 'select']) {
      input.addEventListener(eventName, rememberSelection);
    }
    input.addEventListener('input', () => {
      expressions[index] = input.value;
      rememberSelection();
      persistAndRender();
    });
  });
}

function rememberSelection() {
  const input = inputs[activeRow];
  selection = {
    start: input.selectionStart ?? input.value.length,
    end: input.selectionEnd ?? input.value.length,
  };
}

function setActiveRow(index, restoreAtEnd = false) {
  activeRow = index;
  const input = inputs[index];
  const restoredPosition = restoreAtEnd ? input.value.length : null;
  selection = {
    start: restoredPosition ?? input.selectionStart ?? input.value.length,
    end: restoredPosition ?? input.selectionEnd ?? input.value.length,
  };
  activeLineLabel.textContent = `Line ${index + 1}`;
  document.querySelectorAll('.calculation-row').forEach((row, rowIndex) => {
    row.classList.toggle('is-active', rowIndex === index);
  });
  referencePanel.hidden = true;
  try {
    saveActiveRow(localStorage, index);
  } catch {
    document.querySelector('.storage-note').innerHTML = '<span aria-hidden="true">●</span> Unable to save locally';
  }
}

function render() {
  variableEvaluation = evaluateVariables(variables);
  evaluations = evaluateWorksheet(expressions, variableEvaluation.values);
  evaluations.forEach((evaluation, index) => {
    const row = inputs[index].closest('.calculation-row');
    const output = outputs[index];
    row.dataset.state = evaluation.status;

    if (evaluation.status === 'value') {
      output.innerHTML = `<span class="result-value">${evaluation.display}</span>`;
    } else if (evaluation.status === 'incomplete') {
      output.innerHTML = '<span class="result-value result-muted">…</span><span class="result-note">Finish expression</span>';
    } else if (evaluation.status === 'blank') {
      output.replaceChildren();
    } else {
      output.innerHTML = `<span class="result-note">${evaluation.message}</span>`;
    }
  });
  renderVariableStates();
  renderTotal();
}

function persistAndRender() {
  try {
    saveExpressions(localStorage, expressions);
  } catch {
    document.querySelector('.storage-note').innerHTML = '<span aria-hidden="true">●</span> Unable to save locally';
  }
  render();
}

function persistVariablesAndRender() {
  try {
    saveVariables(localStorage, variables);
  } catch {
    document.querySelector('.storage-note').innerHTML = '<span aria-hidden="true">●</span> Unable to save locally';
  }
  render();
}

function applyEdit(edit) {
  const input = inputs[activeRow];
  input.value = edit.value;
  expressions[activeRow] = edit.value;
  input.focus({ preventScroll: true });
  input.setSelectionRange(edit.selection, edit.selection);
  selection = { start: edit.selection, end: edit.selection };
  persistAndRender();
}

function insertText(text) {
  applyEdit(insertAtSelection(
    expressions[activeRow],
    selection.start,
    selection.end,
    text,
  ));
}

function showLineReferences() {
  referenceOptions.replaceChildren();
  referenceHeading.textContent = 'Use an earlier line';
  if (activeRow === 0) {
    const message = document.createElement('p');
    message.className = 'no-references';
    message.textContent = 'Line 1 has no earlier lines.';
    referenceOptions.append(message);
  } else {
    for (let index = 0; index < activeRow; index += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reference-option';
      button.innerHTML = `<strong>$${index + 1}</strong><span>${evaluations[index].display || evaluations[index].message || 'Empty'}</span>`;
      button.addEventListener('pointerdown', (event) => event.preventDefault());
      button.addEventListener('click', () => {
        insertText(`$${index + 1}`);
        referencePanel.hidden = true;
      });
      referenceOptions.append(button);
    }
  }
  referencePanel.hidden = false;
}

function showVariableReferences() {
  referenceOptions.replaceChildren();
  referenceHeading.textContent = 'Use a named variable';
  const validVariables = variables
    .map((variable, index) => ({ variable, result: variableEvaluation.rows[index] }))
    .filter(({ result }) => result.status === 'value');

  if (validVariables.length === 0) {
    const message = document.createElement('p');
    message.className = 'no-references';
    message.textContent = 'Add a valid variable in the table first.';
    referenceOptions.append(message);
  } else {
    validVariables.forEach(({ variable, result }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'reference-option';

      const name = document.createElement('strong');
      name.textContent = `@${variable.name.trim()}`;
      const value = document.createElement('span');
      value.textContent = formatResult(result.value);
      button.append(name, value);

      button.addEventListener('pointerdown', (event) => event.preventDefault());
      button.addEventListener('click', () => {
        insertText(`@${variable.name.trim()}`);
        referencePanel.hidden = true;
      });
      referenceOptions.append(button);
    });
  }
  referencePanel.hidden = false;
}

function renderTotal() {
  const total = calculateTotal(evaluations);
  totalValue.textContent = total.display;

  const excluded = [
    ...total.blankLines.map((line) => `${line} blank`),
    ...total.invalidLines.map((line) => `${line} invalid`),
  ];
  totalDetail.textContent = excluded.length === 0
    ? 'All 10 lines included'
    : `${total.included} included · Excluded: ${excluded.join(', ')}`;
}

function rebuildVariableRows() {
  variableRows.replaceChildren();
  document.querySelector('#empty-variables').hidden = variables.length > 0;

  variables.forEach((variable, index) => {
    const row = document.createElement('div');
    row.className = 'variable-row';

    const name = document.createElement('input');
    name.type = 'text';
    name.value = variable.name;
    name.autocomplete = 'off';
    name.spellcheck = false;
    name.placeholder = 'e.g. rate';
    name.setAttribute('aria-label', `Variable ${index + 1} name`);

    const value = document.createElement('input');
    value.type = 'text';
    value.inputMode = 'decimal';
    value.value = variable.value;
    value.autocomplete = 'off';
    value.placeholder = '0';
    value.setAttribute('aria-label', `Variable ${index + 1} numeric value`);

    const use = document.createElement('button');
    use.type = 'button';
    use.className = 'use-variable';
    use.setAttribute('aria-label', `Insert variable ${index + 1} into active calculation`);
    use.textContent = '@';
    use.addEventListener('click', () => {
      if (variableEvaluation.rows[index]?.status === 'value') insertText(`@${variable.name.trim()}`);
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-variable';
    remove.setAttribute('aria-label', `Remove variable ${index + 1}`);
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      variables.splice(index, 1);
      rebuildVariableRows();
      persistVariablesAndRender();
    });

    const note = document.createElement('small');
    note.className = 'variable-note';
    row.append(name, value, use, remove, note);
    variableRows.append(row);

    name.addEventListener('input', () => {
      variable.name = name.value;
      persistVariablesAndRender();
    });
    value.addEventListener('input', () => {
      variable.value = value.value;
      persistVariablesAndRender();
    });
  });
}

function renderVariableStates() {
  variableEvaluation.rows.forEach((result, index) => {
    const row = variableRows.children[index];
    if (!row) return;
    row.dataset.state = result.status;
    row.querySelector('.variable-note').textContent = result.message;
    row.querySelector('.use-variable').disabled = result.status !== 'value';
  });
}

keypad.addEventListener('pointerdown', (event) => {
  if (event.target.closest('button')) event.preventDefault();
});

keypad.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.insert !== undefined) {
    insertText(button.dataset.insert);
    return;
  }

  const input = inputs[activeRow];
  if (button.dataset.action === 'backspace') {
    applyEdit(backspaceAtSelection(input.value, selection.start, selection.end));
  } else if (button.dataset.action === 'clear') {
    applyEdit({ value: '', selection: 0 });
  } else if (button.dataset.action === 'reference') {
    showLineReferences();
  } else if (button.dataset.action === 'next') {
    const nextRow = Math.min(activeRow + 1, inputs.length - 1);
    inputs[nextRow].focus({ preventScroll: true });
    inputs[nextRow].setSelectionRange(inputs[nextRow].value.length, inputs[nextRow].value.length);
    inputs[nextRow].closest('.calculation-row').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});

document.querySelector('#show-variables').addEventListener('click', showVariableReferences);

document.querySelector('#add-variable').addEventListener('click', () => {
  variables.push({ name: '', value: '' });
  rebuildVariableRows();
  persistVariablesAndRender();
  variableRows.lastElementChild.querySelector('input').focus();
});

document.querySelector('#close-references').addEventListener('click', () => {
  referencePanel.hidden = true;
  inputs[activeRow].focus();
});

document.querySelector('#clear-all').addEventListener('click', () => {
  if (!window.confirm('Clear all ten lines? This cannot be undone.')) return;
  expressions.fill('');
  inputs.forEach((input) => { input.value = ''; });
  setActiveRow(0);
  inputs[0].focus();
  persistAndRender();
});

createRows();
rebuildVariableRows();
render();
setActiveRow(activeRow, true);
