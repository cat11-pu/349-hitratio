// ratio.js：按名字累计命中/未中，并把命中占比（命中：总数）化到最简
export function bumpOf(counters, name, hit) {
  let row = null;
  for (const item of counters) {
    if (item[0] === name) { row = item; break; }
  }
  if (!row) {
    row = [name, 0, 0];
    counters.push(row);
  }
  row[hit ? 1 : 2] += 1;
  return counters;
}

function gcdOf(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

export function reduceOf(hits, misses) {
  const total = hits + misses;
  if (hits === 0 || total === 0) return [0, 1];
  const g = gcdOf(hits, total) || 1;
  return [hits / g, total / g];
}
