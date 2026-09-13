function selection(expression, selectionStart, selectionEnd) {
  const start = Number.isInteger(selectionStart) ? selectionStart : expression.length;
  const end = Number.isInteger(selectionEnd) ? selectionEnd : start;
  return {
    start: Math.max(0, Math.min(start, expression.length)),
    end: Math.max(0, Math.min(end, expression.length)),
  };
}

export function applyEditorAction(expression, selectionStart, selectionEnd, action) {
  const range = selection(expression, selectionStart, selectionEnd);
  let inserted = "";
  let caretOffset;

  if (action.type === "insert") {
    inserted = action.text;
  } else if (action.type === "sqrt") {
    inserted = "sqrt()";
    caretOffset = 5;
  } else if (action.type === "clear") {
    return { expression: "", caret: 0 };
  } else if (action.type === "backspace") {
    if (range.start !== range.end) {
      return {
        expression: expression.slice(0, range.start) + expression.slice(range.end),
        caret: range.start,
      };
    }
    if (range.start === 0) return { expression, caret: 0 };
    return {
      expression: expression.slice(0, range.start - 1) + expression.slice(range.end),
      caret: range.start - 1,
    };
  } else {
    return { expression, caret: range.start };
  }

  return {
    expression: expression.slice(0, range.start) + inserted + expression.slice(range.end),
    caret: range.start + (caretOffset ?? inserted.length),
  };
}

export function adjacentRow(activeRow, direction) {
  return Math.max(0, Math.min(9, activeRow + direction));
}
