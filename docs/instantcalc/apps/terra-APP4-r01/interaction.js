import { insertAtSelection } from './calculator.js';

export function referencesForRow(rowNumber) {
  return Array.from({ length: Math.max(0, rowNumber - 1) }, (_, index) => `$${index + 1}`);
}

export function backspaceAtSelection(text, start, end) {
  const from = start === end ? Math.max(0, start - 1) : start;
  return { text: insertAtSelection(text, from, end, ''), caret: from };
}
