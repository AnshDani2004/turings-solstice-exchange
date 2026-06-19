export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function createRng(seed = 1) {
  let state = (seed >>> 0) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomNormal(random) {
  const u = Math.max(random(), Number.MIN_VALUE);
  const v = Math.max(random(), Number.MIN_VALUE);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function choose(random, values) {
  return values[Math.floor(random() * values.length)];
}

export function shuffle(random, values) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}
