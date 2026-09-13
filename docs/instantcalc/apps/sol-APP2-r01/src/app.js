import { calculateSheet, calculateTotal, prepareVariables } from "./calculator.js";
import {
  deleteAtSelection,
  insertAtSelection,
  loadActiveLine,
  loadExpressions,
  loadVariables,
  saveActiveLine,
  saveExpressions,
  saveVariables,
} from "./sheet.js";

const sheetElement = document.querySelector("#sheet");
const variablesElement = document.querySelector("#variables");
const variablesEmpty = document.querySelector("#variables-empty");
const addVariableButton = document.querySelector("#add-variable");
const totalResult = document.querySelector("#total-result");
const totalMeta = document.querySelector("#total-meta");
const keypad = document.querySelector(".keypad-card");
const activeLineLabel = document.querySelector("#active-line-label");
const clearKey = document.querySelector("#clear-key");
const referencePanel = document.querySelector("#reference-panel");
const referenceTriggers = document.querySelectorAll('[data-action="reference"]');
const saveState = document.querySelector("#save-state");

let storage;
try {
  storage = window.localStorage;
} catch {
  storage = null;
}

const expressions = loadExpressions(storage);
const variables = loadVariables(storage);
const caretPositions = expressions.map((expression) => expression.length);
const variableCaretPositions = variables.map((variable) => variable.value.length);
const inputs = [];
const outputs = [];
const rows = [];
let variableRows = [];
let variableNameInputs = [];
let variableValueInputs = [];
let variableErrors = [];
let activeIndex = loadActiveLine(storage);
let activeVariableIndex = null;

function buildSheet() {
  expressions.forEach((expression, index) => {
    const lineNumber = index + 1;
    const row = document.createElement("div");
    row.className = "calculation-row";
    row.innerHTML = `
      <span class="line-number" aria-hidden="true">${String(lineNumber).padStart(2, "0")}</span>
      <input
        class="expression"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        spellcheck="false"
        aria-label="Expression for line ${lineNumber}"
        placeholder="${lineNumber === 1 ? "Start a calculation" : `Try $1 + ${lineNumber}`}"
      />
      <output class="result" aria-label="Result for line ${lineNumber}" aria-live="polite"></output>
    `;

    const input = row.querySelector("input");
    const output = row.querySelector("output");
    input.value = expression;

    input.addEventListener("focus", () => activateLine(index));
    input.addEventListener("input", () => {
      expressions[index] = input.value;
      caretPositions[index] = input.selectionStart ?? input.value.length;
      persistAndRender();
    });
    for (const eventName of ["click", "keyup", "select"]) {
      input.addEventListener(eventName, () => {
        caretPositions[index] = input.selectionStart ?? input.value.length;
      });
    }
    row.addEventListener("click", (event) => {
      if (event.target !== input) focusLine(index);
    });

    sheetElement.append(row);
    rows.push(row);
    inputs.push(input);
    outputs.push(output);
  });
}

function buildVariables() {
  variablesElement.replaceChildren();
  variableRows = [];
  variableNameInputs = [];
  variableValueInputs = [];
  variableErrors = [];
  variablesEmpty.hidden = variables.length > 0;

  variables.forEach((variable, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><div class="variable-name-field"><span aria-hidden="true">@</span><input type="text" autocomplete="off" spellcheck="false" aria-label="Variable ${index + 1} name" /></div></td>
      <td><input class="variable-value" type="text" inputmode="decimal" autocomplete="off" aria-label="Variable ${index + 1} numeric value" /></td>
      <td class="variable-actions"><span class="variable-error" aria-live="polite"></span><button type="button" aria-label="Remove variable ${index + 1}">×</button></td>
    `;

    const nameInput = row.querySelector(".variable-name-field input");
    const valueInput = row.querySelector(".variable-value");
    const errorOutput = row.querySelector(".variable-error");
    const removeButton = row.querySelector(".variable-actions button");
    nameInput.value = variable.name;
    valueInput.value = variable.value;

    nameInput.addEventListener("focus", () => activateVariable(index));
    nameInput.addEventListener("input", () => {
      variable.name = nameInput.value;
      if (activeVariableIndex === index) updateVariableHeading();
      persistAndRender();
    });
    valueInput.addEventListener("focus", () => activateVariable(index));
    valueInput.addEventListener("input", () => {
      variable.value = valueInput.value;
      variableCaretPositions[index] = valueInput.selectionStart ?? valueInput.value.length;
      persistAndRender();
    });
    for (const eventName of ["click", "keyup", "select"]) {
      valueInput.addEventListener(eventName, () => {
        variableCaretPositions[index] = valueInput.selectionStart ?? valueInput.value.length;
      });
    }
    removeButton.addEventListener("click", () => removeVariable(index));

    variablesElement.append(row);
    variableRows.push(row);
    variableNameInputs.push(nameInput);
    variableValueInputs.push(valueInput);
    variableErrors.push(errorOutput);
  });
}

function setVariableMode(enabled) {
  keypad.querySelectorAll("[data-token]").forEach((button) => {
    const token = button.dataset.token;
    button.disabled = enabled && !/^\d$/u.test(token) && token !== "." && token !== "−";
  });
  referenceTriggers.forEach((button) => (button.disabled = enabled));
  clearKey.textContent = enabled ? "Clear value" : "Clear line";
}

function activateLine(index) {
  activeIndex = index;
  activeVariableIndex = null;
  saveActiveLine(storage, activeIndex);
  rows.forEach((row, rowIndex) => row.classList.toggle("active", rowIndex === index));
  variableRows.forEach((row) => row.classList.remove("active"));
  activeLineLabel.textContent = `Editing line ${index + 1}`;
  setVariableMode(false);
  if (!referencePanel.hidden) renderReferenceChoices();
}

function updateVariableHeading() {
  const name = variables[activeVariableIndex].name.trim();
  activeLineLabel.textContent = name ? `Editing @${name} value` : "Editing variable value";
}

function activateVariable(index) {
  activeVariableIndex = index;
  rows.forEach((row) => row.classList.remove("active"));
  variableRows.forEach((row, rowIndex) => row.classList.toggle("active", rowIndex === index));
  updateVariableHeading();
  closeReferences();
  setVariableMode(true);
}

function focusLine(index) {
  activateLine(index);
  const input = inputs[index];
  input.focus({ preventScroll: true });
  input.setSelectionRange(caretPositions[index], caretPositions[index]);
}

function focusVariable(index) {
  activateVariable(index);
  const input = variableValueInputs[index];
  input.focus({ preventScroll: true });
  input.setSelectionRange(variableCaretPositions[index], variableCaretPositions[index]);
}

function activeInput() {
  return activeVariableIndex === null ? inputs[activeIndex] : variableValueInputs[activeVariableIndex];
}

function currentSelection() {
  const input = activeInput();
  const fallback =
    activeVariableIndex === null ? caretPositions[activeIndex] : variableCaretPositions[activeVariableIndex];
  if (document.activeElement === input) {
    return { start: input.selectionStart ?? fallback, end: input.selectionEnd ?? fallback };
  }
  return { start: fallback, end: fallback };
}

function applyKeypadEdit(edit) {
  if (activeVariableIndex === null) {
    expressions[activeIndex] = edit.expression;
    caretPositions[activeIndex] = edit.caret;
    inputs[activeIndex].value = edit.expression;
  } else {
    variables[activeVariableIndex].value = edit.expression;
    variableCaretPositions[activeVariableIndex] = edit.caret;
    variableValueInputs[activeVariableIndex].value = edit.expression;
  }
  persistAndRender();

  if (activeVariableIndex === null) focusLine(activeIndex);
  else focusVariable(activeVariableIndex);
  activeInput().setSelectionRange(edit.caret, edit.caret);
}

function activeText() {
  return activeVariableIndex === null ? expressions[activeIndex] : variables[activeVariableIndex].value;
}

function insertToken(token) {
  const { start, end } = currentSelection();
  applyKeypadEdit(insertAtSelection(activeText(), token, start, end));
}

function removeCharacter() {
  const { start, end } = currentSelection();
  applyKeypadEdit(deleteAtSelection(activeText(), start, end));
}

function clearTarget() {
  applyKeypadEdit({ expression: "", caret: 0 });
}

function nextVariableName() {
  const names = new Set(variables.map((variable) => variable.name.trim()));
  let number = 1;
  while (names.has(`variable${number}`)) number += 1;
  return `variable${number}`;
}

function addVariable() {
  variables.push({ name: nextVariableName(), value: "" });
  variableCaretPositions.push(0);
  buildVariables();
  persistAndRender();
  focusVariable(variables.length - 1);
}

function removeVariable(index) {
  variables.splice(index, 1);
  variableCaretPositions.splice(index, 1);
  activeVariableIndex = null;
  buildVariables();
  activateLine(activeIndex);
  persistAndRender();
}

function toggleReferences() {
  referencePanel.hidden = !referencePanel.hidden;
  referenceTriggers.forEach((button) => {
    button.setAttribute("aria-expanded", String(!referencePanel.hidden));
  });
  if (!referencePanel.hidden) renderReferenceChoices();
}

function closeReferences() {
  referencePanel.hidden = true;
  referenceTriggers.forEach((button) => button.setAttribute("aria-expanded", "false"));
}

function appendReferenceGroup(label, references) {
  if (references.length === 0) return;
  const group = document.createElement("div");
  group.className = "reference-group";
  const heading = document.createElement("span");
  heading.textContent = label;
  group.append(heading);

  const choices = document.createElement("div");
  choices.className = "reference-choices";
  references.forEach(({ token, title }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = token;
    button.title = title;
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      insertToken(token);
      closeReferences();
    });
    choices.append(button);
  });
  group.append(choices);
  referencePanel.append(group);
}

function renderReferenceChoices() {
  referencePanel.replaceChildren();
  const label = document.createElement("p");
  label.textContent = "Insert a reference";
  referencePanel.append(label);

  const prepared = prepareVariables(variables);
  const results = calculateSheet(expressions, prepared.values);
  const lines = Array.from({ length: activeIndex }, (_, index) => ({
    token: `$${index + 1}`,
    title: results[index].status === "valid" ? `Line ${index + 1}: ${results[index].display}` : `Line ${index + 1}`,
  }));
  const named = Array.from(prepared.values, ([name, value]) => ({
    token: `@${name}`,
    title: `${name}: ${value}`,
  }));

  appendReferenceGroup("Lines", lines);
  appendReferenceGroup("Variables", named);
  if (lines.length === 0 && named.length === 0) {
    const empty = document.createElement("span");
    empty.className = "reference-empty";
    empty.textContent = "No references are available yet.";
    referencePanel.append(empty);
  }
}

function renderResults() {
  const prepared = prepareVariables(variables);
  prepared.errors.forEach((error, index) => {
    variableRows[index].classList.toggle("invalid", error !== null);
    variableErrors[index].textContent = error ?? "";
  });

  const results = calculateSheet(expressions, prepared.values);
  results.forEach((result, index) => {
    const output = outputs[index];
    output.className = `result ${result.status}`;
    rows[index].dataset.status = result.status;
    if (result.status === "valid") output.textContent = result.display;
    else if (result.status === "pending") output.textContent = "…";
    else if (result.status === "error") output.textContent = result.message;
    else output.textContent = "";
    output.title = result.message ?? "";
  });

  const total = calculateTotal(results);
  totalResult.className = `total-result ${total.status}`;
  totalResult.textContent = total.status === "valid" ? total.display : total.message;
  totalMeta.textContent = `${total.included} included · ${total.excluded} excluded`;
}

function persistAndRender() {
  const saved = saveExpressions(storage, expressions) && saveVariables(storage, variables);
  saveState.classList.toggle("failed", !saved);
  saveState.lastChild.textContent = saved ? " Saved locally" : " Storage unavailable";
  renderResults();
  if (!referencePanel.hidden) renderReferenceChoices();
}

addVariableButton.addEventListener("click", addVariable);

keypad.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) event.preventDefault();
});

keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled || button.closest(".reference-choices")) return;
  if (button.dataset.token !== undefined) insertToken(button.dataset.token);
  else if (button.dataset.action === "backspace") removeCharacter();
  else if (button.dataset.action === "clear") clearTarget();
  else if (button.dataset.action === "reference") toggleReferences();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !referencePanel.hidden) closeReferences();
});

buildSheet();
buildVariables();
activateLine(activeIndex);
persistAndRender();
