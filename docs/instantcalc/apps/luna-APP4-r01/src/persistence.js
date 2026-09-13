export const STORAGE_KEY = 'instantcalc-demo:luna-APP4-r01:instant-calculator-workspace-v1';

export function saveWorkspace(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify({
    expressions: state.expressions,
    variables: state.variables,
    activeRow: state.activeRow,
    selections: state.selections,
    scrollTop: state.scrollTop
  }));
}

export function readWorkspace(storage) {
  const saved = storage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
}
