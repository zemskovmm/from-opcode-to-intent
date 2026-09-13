import {
  calculateTotal,
  evaluateWorksheet,
  formatResult,
  validateVariables,
} from "./calculator.js";

const STORAGE_KEY = "instantcalc-demo:sol-APP1-r01:tenfold.worksheet.v1";
const DEFAULT_NOTE = "Tap a line, then type or use the keypad.";

const linesElement = document.querySelector("#lines");
const keyGrid = document.querySelector("#key-grid");
const referencePanel = document.querySelector("#reference-panel");
const referenceGrid = document.querySelector("#reference-grid");
const variableReferenceGrid = document.querySelector("#variable-reference-grid");
const noVariableReferences = document.querySelector("#no-variable-references");
const referenceKey = document.querySelector("#reference-key");
const statusNote = document.querySelector("#status-note");
const clearAllButton = document.querySelector("#clear-all");
const addVariableButton = document.querySelector("#add-variable");
const variableRowsElement = document.querySelector("#variable-rows");
const totalResult = document.querySelector("#total-result");
const totalDetail = document.querySelector("#total-detail");

const restored = restoreWorksheet();
const expressions = restored.expressions;
const variables = restored.variables;
let activeIndex = restored.activeIndex;
let activeTarget;
let currentResults = [];
let currentVariableResults = [];
let variableControls = [];
const lineInputs = [];
const resultButtons = [];

for (let index = 0; index < 10; index += 1) {
  const item = document.createElement("li");
  item.className = "line";
  item.dataset.line = String(index + 1);

  const input = document.createElement("input");
  input.className = "expression";
  input.type = "text";
  input.inputMode = "decimal";
  input.autocomplete = "off";
  input.autocapitalize = "off";
  input.spellcheck = false;
  input.value = expressions[index];
  input.placeholder = index === 0 ? "Try 12 + 8" : "";
  input.setAttribute("aria-label", `Expression on line ${index + 1}`);

  const result = document.createElement("button");
  result.className = "result";
  result.type = "button";
  result.tabIndex = -1;
  result.setAttribute("aria-label", `No result on line ${index + 1}`);

  input.addEventListener("focus", () => setActiveLine(index));
  input.addEventListener("pointerdown", () => setActiveLine(index));
  input.addEventListener("input", () => {
    expressions[index] = input.value;
    calculate();
    persistWorksheet();
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setActiveLine(Math.min(index + 1, 9), true);
    }
  });
  result.addEventListener("click", () => showResultDetail(result, index));
  result.addEventListener("focus", () => showResultDetail(result, index));

  item.append(input, result);
  linesElement.append(item);
  lineInputs.push(input);
  resultButtons.push(result);
}

for (let lineNumber = 1; lineNumber <= 10; lineNumber += 1) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.reference = String(lineNumber);
  button.innerHTML = `<span>$${lineNumber}</span><small>empty</small>`;
  button.setAttribute("aria-label", `Reference line ${lineNumber}`);
  referenceGrid.append(button);
}

keyGrid.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) event.preventDefault();
});

keyGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.dataset.insert) insertText(button.dataset.insert);
  else handleAction(button.dataset.action);
});

referencePanel.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) event.preventDefault();
});

referencePanel.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.reference) insertText(`$${button.dataset.reference}`);
  else if (button.dataset.variable) insertText(`@${button.dataset.variable}`);
  else return;
  toggleReferences(false);
});

clearAllButton.addEventListener("click", () => {
  if (!expressions.some(Boolean)) return;
  if (!window.confirm("Clear all ten calculation lines? Variables will be kept.")) return;
  expressions.fill("");
  lineInputs.forEach((input) => {
    input.value = "";
  });
  setActiveLine(0, true);
  calculate();
  persistWorksheet();
  statusNote.textContent = "Calculation lines cleared. Variables were kept.";
});

addVariableButton.addEventListener("click", () => {
  variables.push({ name: nextVariableName(), value: "" });
  renderVariableTable();
  calculate();
  persistWorksheet();
  setActiveVariable(variables.length - 1, "value", true);
});

totalDetail.addEventListener("click", () => {
  statusNote.textContent = totalDetail.dataset.message;
});

totalDetail.addEventListener("focus", () => {
  statusNote.textContent = totalDetail.dataset.message;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !referencePanel.hidden) toggleReferences(false);
});

renderVariableTable();
setActiveLine(activeIndex, false);
calculate();

function renderVariableTable() {
  variableRowsElement.replaceChildren();
  variableControls = [];

  if (variables.length === 0) {
    const row = document.createElement("tr");
    row.className = "variables-empty";
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.textContent = "No variables yet. Add one when a value should be reused.";
    row.append(cell);
    variableRowsElement.append(row);
    return;
  }

  variables.forEach((variable, index) => {
    const row = document.createElement("tr");
    row.className = "variable-main-row";

    const nameCell = document.createElement("td");
    const nameInput = document.createElement("input");
    nameInput.className = "variable-input";
    nameInput.type = "text";
    nameInput.autocomplete = "off";
    nameInput.autocapitalize = "off";
    nameInput.spellcheck = false;
    nameInput.value = variable.name;
    nameInput.setAttribute("aria-label", `Variable ${index + 1} name`);
    nameCell.append(nameInput);

    const valueCell = document.createElement("td");
    const valueInput = document.createElement("input");
    valueInput.className = "variable-input";
    valueInput.type = "text";
    valueInput.inputMode = "decimal";
    valueInput.autocomplete = "off";
    valueInput.value = variable.value;
    valueInput.placeholder = "0";
    valueInput.setAttribute("aria-label", `Value for variable ${variable.name}`);
    valueCell.append(valueInput);

    const actionCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.className = "remove-variable";
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Remove variable ${variable.name}`);
    actionCell.append(removeButton);
    row.append(nameCell, valueCell, actionCell);

    const feedbackRow = document.createElement("tr");
    feedbackRow.className = "variable-feedback-row";
    feedbackRow.hidden = true;
    const feedback = document.createElement("td");
    feedback.colSpan = 3;
    feedbackRow.append(feedback);

    nameInput.addEventListener("focus", () => setActiveVariable(index, "name"));
    valueInput.addEventListener("focus", () => setActiveVariable(index, "value"));
    nameInput.addEventListener("input", () => updateVariable(index, "name", nameInput.value));
    valueInput.addEventListener("input", () => updateVariable(index, "value", valueInput.value));
    removeButton.addEventListener("click", () => removeVariable(index));

    variableRowsElement.append(row, feedbackRow);
    variableControls.push({ row, nameInput, valueInput, feedbackRow, feedback });
  });
}

function updateVariable(index, field, value) {
  variables[index][field] = value;
  calculate();
  persistWorksheet();
}

function removeVariable(index) {
  const removedName = variables[index].name;
  variables.splice(index, 1);
  renderVariableTable();
  setActiveLine(activeIndex, false);
  calculate();
  persistWorksheet();
  statusNote.textContent = removedName ? `Removed @${removedName}.` : "Removed variable.";
}

function nextVariableName() {
  const usedNames = new Set(variables.map((variable) => variable.name.toLowerCase()));
  let number = 1;
  while (usedNames.has(`var${number}`)) number += 1;
  return `var${number}`;
}

function setActiveLine(index, focus = false) {
  activeIndex = index;
  activeTarget = { kind: "line", index, input: lineInputs[index] };
  document.querySelectorAll(".line").forEach((line, lineIndex) => {
    line.classList.toggle("active", lineIndex === activeIndex);
  });
  variableControls.forEach(({ row }) => row.classList.remove("active"));
  statusNote.textContent = DEFAULT_NOTE;
  updateKeypadAvailability();
  if (focus) {
    lineInputs[index].focus({ preventScroll: true });
    lineInputs[index].scrollIntoView({ behavior: "smooth", block: "center" });
  }
  persistWorksheet();
}

function setActiveVariable(index, field, focus = false) {
  const controls = variableControls[index];
  if (!controls) return;
  const input = field === "name" ? controls.nameInput : controls.valueInput;
  activeTarget = { kind: "variable", index, field, input };
  document.querySelectorAll(".line").forEach((line) => line.classList.remove("active"));
  variableControls.forEach(({ row }, rowIndex) => {
    row.classList.toggle("active", rowIndex === index);
  });
  toggleReferences(false);
  statusNote.textContent =
    field === "value"
      ? `Editing @${variables[index].name || "variable"}. The keypad enters its numeric value.`
      : "Variable names use letters, numbers, and underscores and must start with a letter.";
  updateKeypadAvailability();
  if (focus) {
    input.focus({ preventScroll: true });
    input.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function updateKeypadAvailability() {
  keyGrid.querySelectorAll("button").forEach((button) => {
    if (activeTarget?.kind !== "variable") {
      button.disabled = false;
      return;
    }

    const simpleAction = button.dataset.action === "backspace" || button.dataset.action === "clear";
    const numericInsert =
      activeTarget.field === "value" && /^[0-9.+−-]$/.test(button.dataset.insert ?? "");
    button.disabled = !(simpleAction || numericInsert);
  });
}

function calculate() {
  currentVariableResults = validateVariables(variables);
  currentResults = evaluateWorksheet(expressions, variables);
  currentResults.forEach((calculation, index) => renderResult(calculation, index));
  renderVariableStatuses();
  renderTotal();
  updateReferencePreviews();
}

function renderVariableStatuses() {
  currentVariableResults.forEach((validation, index) => {
    const controls = variableControls[index];
    if (!controls) return;
    const hasError = validation.status === "error";
    controls.nameInput.setAttribute("aria-invalid", String(hasError));
    controls.valueInput.setAttribute("aria-invalid", String(hasError));
    controls.nameInput.title = validation.message ?? "";
    controls.valueInput.title = validation.message ?? "";
    controls.feedbackRow.hidden = !validation.message;
    controls.feedback.textContent = validation.message ?? "";
    controls.valueInput.setAttribute(
      "aria-label",
      `Value for variable ${variables[index].name || index + 1}`,
    );
  });
}

function renderTotal() {
  const total = calculateTotal(currentResults);
  const formatted = formatResult(total.value);
  totalResult.value = formatted;
  totalResult.textContent = formatted;
  totalDetail.textContent = `${total.includedCount} included · ${total.excludedCount} excluded`;
  totalDetail.dataset.message =
    total.excludedCount === 0
      ? "Total includes all ten calculation lines."
      : `Total excludes lines ${total.excludedLines.join(", ")} because they are blank or do not have a valid result.`;
  totalDetail.title = totalDetail.dataset.message;
  totalResult.setAttribute("aria-label", `Total: ${formatted}`);
}

function renderResult(calculation, index) {
  const button = resultButtons[index];
  button.className = `result ${calculation.status}`;
  button.dataset.message = calculation.message ?? "";
  button.dataset.hasDetail = String(Boolean(calculation.message));
  button.title = calculation.message ?? "";
  button.tabIndex = calculation.message ? 0 : -1;

  if (calculation.status === "result") {
    const formatted = formatResult(calculation.value);
    button.textContent = formatted;
    button.setAttribute("aria-label", `Result on line ${index + 1}: ${formatted}`);
  } else if (calculation.status === "incomplete") {
    button.textContent = "···";
    button.setAttribute("aria-label", `Line ${index + 1} is unfinished: ${calculation.message}`);
  } else if (calculation.status === "dependency") {
    button.textContent = "waiting";
    button.setAttribute("aria-label", `Line ${index + 1}: ${calculation.message}`);
  } else if (calculation.status === "error" || calculation.status === "circular") {
    button.textContent = "!";
    button.setAttribute("aria-label", `Error on line ${index + 1}: ${calculation.message}`);
  } else {
    button.textContent = "";
    button.setAttribute("aria-label", `No result on line ${index + 1}`);
  }
}

function showResultDetail(result, index) {
  if (result.dataset.message) statusNote.textContent = `Line ${index + 1}: ${result.dataset.message}`;
}

function updateReferencePreviews() {
  referenceGrid.querySelectorAll("button").forEach((button, index) => {
    const preview = button.querySelector("small");
    const calculation = currentResults[index];
    if (calculation.status === "result") preview.textContent = formatResult(calculation.value);
    else if (calculation.status === "empty") preview.textContent = "empty";
    else preview.textContent = "unavailable";
  });

  variableReferenceGrid.replaceChildren();
  currentVariableResults.forEach((variable) => {
    if (variable.status !== "result") return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.variable = variable.name;
    button.setAttribute("aria-label", `Reference variable ${variable.name}`);
    const name = document.createElement("span");
    name.textContent = `@${variable.name}`;
    const value = document.createElement("small");
    value.textContent = formatResult(variable.value);
    button.append(name, value);
    variableReferenceGrid.append(button);
  });
  noVariableReferences.hidden = variableReferenceGrid.childElementCount > 0;
}

function insertText(text, cursorOffset = text.length) {
  const input = activeTarget.input;
  const insertion = activeTarget.kind === "variable" && text === "−" ? "-" : text;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.setRangeText(insertion, start, end, "end");
  const nextCursor = start + Math.min(cursorOffset, insertion.length);
  input.setSelectionRange(nextCursor, nextCursor);
  syncActiveTarget();
  input.focus({ preventScroll: true });
  calculate();
  persistWorksheet();
}

function handleAction(action) {
  const input = activeTarget.input;
  if (action === "sqrt" && activeTarget.kind === "line") {
    insertText("sqrt()", 5);
  } else if (action === "backspace") {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    if (start !== end) input.setRangeText("", start, end, "end");
    else if (start > 0) input.setRangeText("", start - 1, start, "end");
    syncActiveTarget();
    input.focus({ preventScroll: true });
    calculate();
    persistWorksheet();
  } else if (action === "clear") {
    input.value = "";
    syncActiveTarget();
    input.focus({ preventScroll: true });
    calculate();
    persistWorksheet();
  } else if (action === "references" && activeTarget.kind === "line") {
    toggleReferences(referencePanel.hidden);
  }
}

function syncActiveTarget() {
  if (activeTarget.kind === "line") expressions[activeTarget.index] = activeTarget.input.value;
  else variables[activeTarget.index][activeTarget.field] = activeTarget.input.value;
}

function toggleReferences(open) {
  referencePanel.hidden = !open;
  referenceKey.setAttribute("aria-expanded", String(open));
}

function persistWorksheet() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ expressions, activeIndex, variables }));
  } catch {
    statusNote.textContent = "This browser could not save the worksheet.";
  }
}

function restoreWorksheet() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const savedExpressions = Array.isArray(saved?.expressions) ? saved.expressions : [];
    const savedVariables = Array.isArray(saved?.variables) ? saved.variables : [];
    return {
      expressions: Array.from({ length: 10 }, (_, index) =>
        typeof savedExpressions[index] === "string" ? savedExpressions[index] : "",
      ),
      activeIndex:
        Number.isInteger(saved?.activeIndex) && saved.activeIndex >= 0 && saved.activeIndex < 10
          ? saved.activeIndex
          : 0,
      variables: savedVariables.map((variable) => ({
        name: typeof variable?.name === "string" ? variable.name : "",
        value:
          typeof variable?.value === "string" || typeof variable?.value === "number"
            ? String(variable.value)
            : "",
      })),
    };
  } catch {
    return { expressions: Array(10).fill(""), activeIndex: 0, variables: [] };
  }
}
