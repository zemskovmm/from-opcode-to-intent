export class Worksheet {
  constructor(storage) {
    this.storage = storage;
    this.saved = true;
    this.rows = Array(10).fill('');
    this.variables = [];
    this.active = 0;
    this.start = this.end = 0;
    this.reference = null;
    try {
      const rows = JSON.parse(storage.getItem('instantcalc-demo:astra-APP4-r01:instantcalc.rows.v1'));
      if (Array.isArray(rows) && rows.length === 10 && rows.every(row => typeof row === 'string')) {
        this.rows = rows;
      }
    } catch { this.saved = false; }
    // Keep the original row key intact and load variables independently.
    try {
      const variables = JSON.parse(storage.getItem('instantcalc-demo:astra-APP4-r01:instantcalc.variables.v1'));
      if (Array.isArray(variables) && variables.every(variable =>
        variable && typeof variable.name === 'string' && typeof variable.value === 'string')) {
        this.variables = variables.map(({ name, value }) => ({ name, value }));
      }
    } catch { this.saved = false; }
    try {
      const row = JSON.parse(storage.getItem('instantcalc-demo:astra-APP4-r01:instantcalc.activeRow.v1'));
      if (Number.isInteger(row) && row >= 1 && row <= 10) this.active = row - 1;
    } catch { this.saved = false; }
    this.start = this.end = this.rows[this.active].length;
  }
  save() {
    try {
      this.storage.setItem('instantcalc-demo:astra-APP4-r01:instantcalc.rows.v1', JSON.stringify(this.rows));
      this.storage.setItem('instantcalc-demo:astra-APP4-r01:instantcalc.variables.v1', JSON.stringify(this.variables));
      this.storage.setItem('instantcalc-demo:astra-APP4-r01:instantcalc.activeRow.v1', JSON.stringify(this.active + 1));
      this.saved = true;
    } catch { this.saved = false; }
  }
  addVariable() {
    this.variables.push({ name: '', value: '' });
    this.save();
  }
  editVariable(index, field, value) {
    this.variables[index][field] = value;
    this.save();
  }
  removeVariable(index) {
    this.variables.splice(index, 1);
    this.save();
  }
  edit(text, start = text.length, end = start) {
    this.rows[this.active] = text;
    this.start = start;
    this.end = end;
    this.save();
  }
  insert(text) {
    const current = this.rows[this.active];
    this.edit(current.slice(0, this.start) + text + current.slice(this.end), this.start + text.length);
  }
  backspace() {
    if (this.start === this.end) this.start = Math.max(0, this.start - 1);
    this.insert('');
  }
  select(row) {
    if (this.reference) {
      const { active, start, end } = this.reference;
      Object.assign(this, { active, start, end, reference: null });
      this.insert(`$${row + 1}`);
      return;
    }
    this.active = Math.max(0, Math.min(9, row));
    this.start = this.end = this.rows[this.active].length;
    this.save();
  }
  move(offset) {
    const edge = offset < 0 ? this.start : this.end;
    const next = this.start !== this.end ? edge : edge + offset;
    this.start = this.end = Math.max(0, Math.min(this.rows[this.active].length, next));
  }
  navigate(offset) { this.select(this.active + offset); }
  useRow() {
    this.reference = { active: this.active, start: this.start, end: this.end };
  }
  cancelReference() { this.reference = null; }
  clearRow() { this.edit(''); }
  clearAll(confirmed) {
    if (!confirmed) return;
    this.rows = Array(10).fill('');
    this.reference = null;
    this.select(0);
  }
}
