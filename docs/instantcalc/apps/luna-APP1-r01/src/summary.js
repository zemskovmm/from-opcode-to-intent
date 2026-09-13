export function summarizeResults(states) {
  return states.reduce((summary, state) => {
    if (state.status === 'ok') summary.total += state.value;
    else summary.excluded += 1;
    return summary;
  }, { total: 0, excluded: 0 });
}
