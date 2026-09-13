const VARIABLE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

export function isValidVariableName(name) {
  return VARIABLE_NAME_PATTERN.test(name);
}

export function resolveVariables(rows) {
  const names = rows.map((row) => String(row?.name ?? ''));
  const counts = names.reduce((result, name) => {
    if (isValidVariableName(name)) result[name] = (result[name] ?? 0) + 1;
    return result;
  }, {});
  const statuses = names.map((name, index) => {
    const rawValue = String(rows[index]?.value ?? '').trim();
    if (!name) return 'empty';
    if (!isValidVariableName(name)) return 'invalid';
    if (counts[name] > 1) return 'duplicate';
    if (!rawValue) return 'empty-value';
    return Number.isFinite(Number(rawValue)) ? 'ok' : 'invalid-value';
  });
  const values = {};

  rows.forEach((row, index) => {
    if (statuses[index] === 'ok') values[names[index]] = Number(row.value);
  });

  return { values, statuses };
}
