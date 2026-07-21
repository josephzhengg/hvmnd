import { modeSignature, encodeChallenge, decodeChallenge } from './signature';
import { rangesForDifficulty } from './problems';
import type { Config } from './types';

function cfg(over: Partial<Config> = {}): Config {
  return {
    operations: ['add', 'mul'],
    difficulty: 'medium',
    ranges: rangesForDifficulty('medium'),
    allowNegatives: false,
    mode: 'timed',
    durationSec: 60,
    problemCount: 20,
    seed: 123,
    ...over,
  };
}

test('signature ignores seed', () => {
  expect(modeSignature(cfg({ seed: 1 }))).toBe(modeSignature(cfg({ seed: 999 })));
});

test('signature is operation-order independent', () => {
  expect(modeSignature(cfg({ operations: ['add', 'mul'] })))
    .toBe(modeSignature(cfg({ operations: ['mul', 'add'] })));
});

test('signature differs by difficulty and mode', () => {
  expect(modeSignature(cfg({ difficulty: 'easy' })))
    .not.toBe(modeSignature(cfg({ difficulty: 'hard' })));
  expect(modeSignature(cfg({ mode: 'timed', durationSec: 60 })))
    .not.toBe(modeSignature(cfg({ mode: 'fixed', problemCount: 20 })));
});

test('challenge encode/decode round-trips including seed', () => {
  const c = cfg({ seed: 424242 });
  const decoded = decodeChallenge(encodeChallenge(c));
  expect(decoded).toEqual(c);
});

test('decodeChallenge returns null on garbage', () => {
  expect(decodeChallenge('not-base64-$$$')).toBeNull();
  expect(decodeChallenge('')).toBeNull();
});

test('decodeChallenge rejects a config missing ranges for an enabled operation', () => {
  const bad = {
    operations: ['add'],
    difficulty: 'medium',
    ranges: {},
    allowNegatives: false,
    mode: 'timed',
    durationSec: 60,
    problemCount: 20,
    seed: 1,
  } as unknown as Config;
  expect(decodeChallenge(encodeChallenge(bad))).toBeNull();
});
