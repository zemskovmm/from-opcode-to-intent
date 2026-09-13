import { evaluateWorksheet } from './calculator.js';

const STORAGE_KEY = 'instantcalc-demo:astra-APP2-r01:instantcalc.worksheet.v1';

export class Worksheet {
  constructor(storage) {
    this.storage = storage;
    this.rows = Array(10).fill('');
    this.variables = [];
    this.active = 0;
    this.saved = true;
    try {
      const stored = JSON.parse(storage.getItem(STORAGE_KEY));
      if (stored && Array.isArray(stored.rows) && stored.rows.length === 10 &&
          stored.rows.every(row => typeof row === 'string' && row.length <= 1000)) {
        this.rows = stored.rows;
        this.active = Number.isInteger(stored.active) ? Math.max(0, Math.min(9, stored.active)) : 0;
      }
      if (Array.isArray(stored?.variables) && stored.variables.every(variable => variable &&
          typeof variable.name === 'string' && variable.name.length <= 32 &&
          typeof variable.value === 'string' && variable.value.length <= 1000)) {
        this.variables = stored.variables;
      }
    } catch { this.saved = false; }
  }
  save() {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify({ rows: this.rows, active: this.active, variables: this.variables }));
      this.saved = true;
    } catch { this.saved = false; }
  }
  setRow(index, text) {
    this.rows[index] = text.slice(0, 1000);
    this.save();
  }
  select(index) {
    this.active = Math.max(0, Math.min(9, index));
    this.save();
  }
  next() { this.select(this.active + 1); }
  addVariable() {
    let number = 1;
    while (this.variables.some(variable => variable.name === `v${number}`)) number++;
    this.variables.push({ name: `v${number}`, value: '0' });
    this.save();
  }
  setVariable(index, field, text) {
    if (field !== 'name' && field !== 'value') return;
    this.variables[index][field] = text.slice(0, field === 'name' ? 32 : 1000);
    this.save();
  }
  removeVariable(index) {
    this.variables.splice(index, 1);
    this.save();
  }
  clear() {
    this.rows = Array(10).fill('');
    this.active = 0;
    this.save();
  }
  get results() { return evaluateWorksheet(this.rows, this.variables); }
}

export function editText(text, start, end, insertion) {
  if (insertion === 'backspace') {
    if (start === end) start = Math.max(0, start - 1);
    insertion = '';
  }
  return { text: text.slice(0, start) + insertion + text.slice(end), cursor: start + insertion.length };
}
