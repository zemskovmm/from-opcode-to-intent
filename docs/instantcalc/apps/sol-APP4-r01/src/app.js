import { analyzeVariables, calculateTotal, calculateWorksheet } from "./calculator.js";
import { adjacentRow, applyEditorAction } from "./editor.js";
import {
  appendVariable,
  initialWorksheet,
  removeVariableAt,
  removeWorksheet,
  restoreWorksheet,
  saveWorksheet,
} from "./storage.js";

const state = restoreWorksheet(localStorage);
const rowsElement = document.querySelector("#rows");
const keypad = document.querySelector("#keypad");
const modeToggle = document.querySelector("#mode-toggle");
const modeLabel = document.querySelector("#mode-label");
const referenceToggle = document.querySelector("#reference-toggle");
const referencePicker = document.querySelector("#reference-picker");
const clearDialog = document.querySelector("#clear-dialog");
const variableRowsElement = document.querySelector("#variable-rows");
const totalResult = document.querySelector("#total-result");
const totalSummary = document.querySelector("#total-summary");
const inputs = [];
const rowElements = [];
const outputs = [];

function persist() {
  try {
    saveWorksheet(localStorage, state);
  } catch {
    // The worksheet remains usable if storage is unavailable.
  }
}

function createRows() {
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < 10; index += 1) {
    const row = document.createElement("div");
    row.className = "calc-row";
    row.dataset.row = String(index);

    const number = document.createElement("button");
    number.className = "row-number";
    number.type = "button";
    number.textContent = String(index + 1).padStart(2, "0");
    number.setAttribute("aria-label", `Line ${index + 1}`);

    const input = document.createElement("input");
    input.className = "expression";
    input.type = "text";
    input.autocomplete = "off";
    input.autocapitalize = "off";
    input.spellcheck = false;
    input.enterKeyHint = "next";
    input.value = state.expressions[index];
    input.placeholder = index === 0 ? "Try 12 * 8" : "Enter an expression";
    input.setAttribute("aria-label", `Expression for line ${index + 1}`);

    const output = document.createElement("output");
    output.className = "result";
    output.setAttribute("aria-label", `Result for line ${index + 1}`);
    output.setAttribute("aria-live", "polite");

    row.append(number, input, output);
    fragment.append(row);
    inputs.push(input);
    rowElements.push(row);
    outputs.push(output);

    number.addEventListener("pointerdown", (event) => event.preventDefault());
    number.addEventListener("click", () => handleRowNumber(index));
    input.addEventListener("focus", () => setActiveRow(index));
    input.addEventListener("input", () => {
      state.expressions[index] = input.value;
      persist();
      renderResults();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      navigateRow(event.shiftKey ? -1 : 1);
    });
  }

  rowsElement.append(fragment);
}

function renderVariableRows() {
  variableRowsElement.replaceChildren();

  state.variables.forEach((variable, index) => {
    const row = document.createElement("div");
    row.className = "variable-row";

    const name = document.createElement("input");
    name.className = "variable-input variable-name";
    name.type = "text";
    name.value = variable.name;
    name.placeholder = "rate";
    name.autocomplete = "off";
    name.autocapitalize = "off";
    name.spellcheck = false;
    name.setAttribute("aria-label", `Variable ${index + 1} name`);

    const value = document.createElement("input");
    value.className = "variable-input variable-value";
    value.type = "text";
    value.inputMode = "decimal";
    value.value = variable.value;
    value.placeholder = "0.00";
    value.autocomplete = "off";
    value.spellcheck = false;
    value.setAttribute("aria-label", `Variable ${index + 1} value`);

    const status = document.createElement("output");
    status.className = "variable-status";
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-label", `Variable ${index + 1} status`);

    const remove = document.createElement("button");
    remove.className = "remove-variable";
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove variable ${index + 1}`);

    name.addEventListener("input", () => updateVariable(index, "name", name.value));
    value.addEventListener("input", () => updateVariable(index, "value", value.value));
    remove.addEventListener("click", () => removeVariable(index));

    row.append(name, value, status, remove);
    variableRowsElement.append(row);
  });

  renderVariableStatuses();
}

function updateVariable(index, field, value) {
  state.variables[index][field] = value;
  persist();
  renderVariableStatuses();
  renderReferencePicker();
  renderResults();
}

function removeVariable(index) {
  state.variables = removeVariableAt(state.variables, index);
  persist();
  renderVariableRows();
  renderReferencePicker();
  renderResults();
}

function renderVariableStatuses() {
  const analysis = analyzeVariables(state.variables);
  const rows = variableRowsElement.querySelectorAll(".variable-row");

  analysis.entries.forEach((entry, index) => {
    const row = rows[index];
    const status = row.querySelector(".variable-status");
    status.value = entry.message;
    status.textContent = entry.message;
    status.dataset.kind = entry.kind;
    row.dataset.state = entry.kind;
  });
}

function focusedEditor() {
  return document.activeElement?.classList.contains("expression") ? document.activeElement : null;
}

function setActiveRow(index) {
  state.activeRow = index;
  persist();
  renderActiveRow();
  renderReferencePicker();

  if (state.mode === "keypad") {
    requestAnimationFrame(() => navigator.virtualKeyboard?.hide());
  }
}

function activateAndFocus(index) {
  setActiveRow(index);
  const input = inputs[index];
  input.focus({ preventScroll: true });
  input.setSelectionRange(input.value.length, input.value.length);
  input.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function handleRowNumber(index) {
  const editor = focusedEditor();
  if (editor) {
    const editorIndex = inputs.indexOf(editor);
    if (index < editorIndex) {
      performAction({ type: "insert", text: `$${index + 1}` });
      return;
    }
    editor.blur();
  }
  setActiveRow(index);
}

function performAction(action) {
  const input = inputs[state.activeRow];
  const hasCaret = document.activeElement === input;
  const edited = applyEditorAction(
    state.expressions[state.activeRow],
    hasCaret ? input.selectionStart : null,
    hasCaret ? input.selectionEnd : null,
    action,
  );

  state.expressions[state.activeRow] = edited.expression;
  input.value = edited.expression;
  persist();
  renderResults();
  input.focus({ preventScroll: true });
  input.setSelectionRange(edited.caret, edited.caret);
}

function navigateRow(direction) {
  activateAndFocus(adjacentRow(state.activeRow, direction));
}

function renderResults() {
  const results = calculateWorksheet(state.expressions, state.variables);
  results.forEach((result, index) => {
    const output = outputs[index];
    output.value = result.display;
    output.textContent = result.display;
    output.title = result.display;
    output.dataset.kind = result.kind;
    rowElements[index].dataset.state = result.kind;
  });

  const total = calculateTotal(results);
  totalResult.value = total.display;
  totalResult.textContent = total.display;
  totalResult.title = total.display;
  totalResult.dataset.kind = total.value === undefined ? "undefined" : "success";
  totalSummary.textContent = total.summary;
}

function renderActiveRow() {
  rowElements.forEach((row, index) => {
    const active = index === state.activeRow;
    row.classList.toggle("active", active);
    row.querySelector(".row-number").setAttribute("aria-current", active ? "true" : "false");
  });
}

function renderMode() {
  const nativeMode = state.mode === "native";
  keypad.hidden = nativeMode;
  document.body.classList.toggle("native-mode", nativeMode);
  modeToggle.setAttribute("aria-pressed", String(nativeMode));
  modeLabel.textContent = nativeMode ? "Show keypad" : "Use keyboard";
  document.querySelector(".mode-icon").textContent = nativeMode ? "▦" : "⌨";
  inputs.forEach((input) => {
    input.inputMode = nativeMode ? "text" : "none";
    input.setAttribute("virtualkeyboardpolicy", nativeMode ? "auto" : "manual");
  });
}

function renderReferencePicker() {
  referencePicker.replaceChildren();
  const variableNames = [...new Set(
    state.variables
      .map((variable) => variable.name)
      .filter((name) => /^[a-z][a-z0-9_]*$/.test(name)),
  )];
  const hasReferences = state.activeRow > 0 || variableNames.length > 0;
  referenceToggle.disabled = !hasReferences;
  referenceToggle.title = hasReferences ? "Insert a line or variable reference" : "No references available";

  const addHeading = (label) => {
    const heading = document.createElement("span");
    heading.className = "reference-heading";
    heading.textContent = label;
    referencePicker.append(heading);
  };

  const addReference = (text, label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.setAttribute("aria-label", label);
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", () => {
      performAction({ type: "insert", text });
      closeReferencePicker();
    });
    referencePicker.append(button);
  };

  if (state.activeRow > 0) {
    addHeading("Earlier lines");
    for (let index = 0; index < state.activeRow; index += 1) {
      addReference(`$${index + 1}`, `Insert reference to line ${index + 1}`);
    }
  }

  if (variableNames.length > 0) {
    addHeading("Variables");
    variableNames.forEach((name) => addReference(`$${name}`, `Insert variable ${name}`));
  }
}

function closeReferencePicker() {
  referencePicker.hidden = true;
  referenceToggle.setAttribute("aria-expanded", "false");
}

keypad.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) event.preventDefault();
});

keypad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.closest("#reference-picker")) return;

  if (button.dataset.insert !== undefined) {
    performAction({ type: "insert", text: button.dataset.insert });
  } else if (button.dataset.action) {
    performAction({ type: button.dataset.action });
  } else if (button.dataset.nav) {
    navigateRow(Number(button.dataset.nav));
  }
});

referenceToggle.addEventListener("click", () => {
  const willOpen = referencePicker.hidden;
  referencePicker.hidden = !willOpen;
  referenceToggle.setAttribute("aria-expanded", String(willOpen));
});

modeToggle.addEventListener("click", () => {
  const editor = focusedEditor();
  const selection = editor ? [editor.selectionStart, editor.selectionEnd] : null;
  state.mode = state.mode === "keypad" ? "native" : "keypad";
  persist();
  renderMode();
  if (editor && selection) {
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(...selection);
  }
});

modeToggle.addEventListener("pointerdown", (event) => event.preventDefault());

document.addEventListener("click", (event) => {
  if (!event.target.closest(".reference-control")) closeReferencePicker();
});

document.querySelector("#clear-all").addEventListener("click", () => clearDialog.showModal());

document.querySelector("#add-variable").addEventListener("click", () => {
  state.variables = appendVariable(state.variables);
  persist();
  renderVariableRows();
  variableRowsElement.querySelector(".variable-row:last-child .variable-name").focus();
});

document.querySelector("#confirm-clear").addEventListener("click", () => {
  removeWorksheet(localStorage);
  Object.assign(state, initialWorksheet());
  inputs.forEach((input) => {
    input.value = "";
    input.blur();
  });
  renderVariableRows();
  closeReferencePicker();
  renderMode();
  renderActiveRow();
  renderReferencePicker();
  renderResults();
});

createRows();
renderVariableRows();
renderMode();
renderActiveRow();
renderReferencePicker();
renderResults();
