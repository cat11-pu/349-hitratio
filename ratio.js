// ratio.js：计数累加与化简
function gcdOf(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

export function bumpOf(counters, name, hit) {
  let row = null;
  for (const item of counters) {
    if (item[0] === name) { row = item; break; }
  }
  if (!row) {
    row = [name, 0, 0];
    counters.push(row);
  }
  if (hit) { row[1] += 1; } else { row[2] += 1; }
  return counters;
}

export function reduceOf(hits, misses) {
  if (hits === 0) { return [0, 1]; }
  const total = hits + misses;
  const g = gcdOf(hits, total) || 1;
  return [hits / g, total / g];
}
