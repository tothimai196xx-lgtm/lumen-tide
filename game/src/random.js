// A small seeded generator (mulberry32): the same seed always deals the same tide, which is
// what makes the screenshot scenes reproducible and the game testable.
export function createRandom(seed) {
  let state = seed >>> 0;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(max) {
      return Math.floor(next() * max);
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
  };
}
