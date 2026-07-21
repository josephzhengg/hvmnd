import { mulberry32, randInt } from './rng';

test('mulberry32 is deterministic for a given seed', () => {
  const a = mulberry32(123);
  const b = mulberry32(123);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  expect(seqA).toEqual(seqB);
});

test('different seeds produce different sequences', () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  expect(a()).not.toEqual(b());
});

test('randInt stays within inclusive bounds', () => {
  const rng = mulberry32(42);
  for (let i = 0; i < 500; i++) {
    const n = randInt(rng, 3, 7);
    expect(n).toBeGreaterThanOrEqual(3);
    expect(n).toBeLessThanOrEqual(7);
    expect(Number.isInteger(n)).toBe(true);
  }
});

test('randInt can hit both endpoints', () => {
  const rng = mulberry32(99);
  const seen = new Set<number>();
  for (let i = 0; i < 500; i++) seen.add(randInt(rng, 1, 2));
  expect(seen.has(1)).toBe(true);
  expect(seen.has(2)).toBe(true);
});
