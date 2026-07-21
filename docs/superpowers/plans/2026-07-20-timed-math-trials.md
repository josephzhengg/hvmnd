# Timed Math Trials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive React web app for timed mental-arithmetic trials (+ − × ÷) with customization, personal high scores, a live global leaderboard, and shareable seeded challenge links.

**Architecture:** A framework-free TypeScript game engine (seeded RNG → deterministic problem stream + scoring) sits under a React (Vite) UI. Score persistence hides behind a `ScoreStore` interface with a `LocalStore` (localStorage) default and a `SupabaseStore` used when creds are present, so the app runs immediately and upgrades to a real live leaderboard by adding env vars.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS v3, `@supabase/supabase-js` v2, Vitest + React Testing Library + jsdom.

## Global Constraints

- Node 18+; package manager `npm`.
- Tailwind CSS **v3** (`tailwindcss@^3`), PostCSS + autoprefixer.
- All gameplay logic runs client-side. No accounts/auth; players supply a display name only (1–24 chars).
- Env vars are Vite-prefixed: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Absence ⇒ local fallback (never crash).
- Division always yields whole-number answers; divisor ≥ 1. Subtraction ≥ 0 unless `allowNegatives`.
- Domain type names are fixed by Task 2 and used verbatim everywhere: `Operation = 'add'|'sub'|'mul'|'div'`, `Mode = 'timed'|'fixed'`, `Difficulty = 'easy'|'medium'|'hard'|'custom'`.
- TDD throughout: failing test → minimal impl → passing test → commit.

---

## File Structure

```
package.json, vite.config.ts, tsconfig.json, tailwind.config.js, postcss.config.js
index.html
.env.example
supabase/schema.sql
README.md
src/
  main.tsx
  index.css
  App.tsx
  test/setup.ts
  engine/
    types.ts
    rng.ts
    problems.ts
    scoring.ts
    signature.ts
  storage/
    ScoreStore.ts
    LocalStore.ts
    SupabaseStore.ts
    supabaseClient.ts
    index.ts
  hooks/
    usePreferences.ts
    useTimer.ts
    useGameEngine.ts
    useLeaderboard.ts
  components/
    ProblemDisplay.tsx
    Numpad.tsx
    TimerBar.tsx
    OperationToggle.tsx
  screens/
    ConfigScreen.tsx
    TrialScreen.tsx
    ResultsScreen.tsx
    LeaderboardScreen.tsx
```

---

### Task 1: Project scaffold (Vite + React + TS + Tailwind + Vitest)

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `postcss.config.js`, `tailwind.config.js`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test/setup.ts`, `.gitignore`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: a running dev server (`npm run dev`), `npm test` wired to Vitest+jsdom+RTL, Tailwind active. `App` default export renders a title.

- [ ] **Step 1: Initialize project and install deps**

```bash
cd /Users/josephzheng/self_projects/hvmnd
git init
npm init -y
npm install react react-dom @supabase/supabase-js
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom \
  vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  tailwindcss@^3 postcss autoprefixer
```

- [ ] **Step 2: Write config files**

`package.json` (merge/replace the `scripts` and set `"type": "module"`):

```json
{
  "name": "hvmnd",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

`postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: [],
};
```

`.gitignore`:

```
node_modules
dist
.env
.DS_Store
```

- [ ] **Step 3: Write app entry + Tailwind CSS + test setup**

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>hvmnd — math trials</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light dark; }
html, body, #root { height: 100%; }
body { margin: 0; -webkit-tap-highlight-color: transparent; }
```

`src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

`src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="min-h-full grid place-items-center bg-slate-50 text-slate-900">
      <h1 className="text-3xl font-bold">hvmnd</h1>
    </main>
  );
}
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Write the failing smoke test**

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the app title', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /hvmnd/i })).toBeInTheDocument();
});
```

- [ ] **Step 5: Run the test — expect PASS**

Run: `npm test`
Expected: 1 passing test. (Also verify `npm run dev` boots without error, then stop it.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind + Vitest"
```

---

### Task 2: Domain types

**Files:**
- Create: `src/engine/types.ts`

**Interfaces:**
- Produces: all shared domain types used by every later task. No tests (type-only module).

- [ ] **Step 1: Write the types**

`src/engine/types.ts`:

```ts
export type Operation = 'add' | 'sub' | 'mul' | 'div';
export type Mode = 'timed' | 'fixed';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'custom';

export interface OpRange {
  min: number;
  max: number;
}

export interface Config {
  operations: Operation[];
  difficulty: Difficulty;
  ranges: Record<Operation, OpRange>;
  allowNegatives: boolean;
  mode: Mode;
  durationSec: number;   // used when mode === 'timed'
  problemCount: number;  // used when mode === 'fixed'
  seed: number;          // deterministic generation for challenge links
}

export interface Problem {
  a: number;
  b: number;
  op: Operation;
  answer: number;
  prompt: string; // e.g. "12 × 3"
}

export interface Attempt {
  problem: Problem;
  given: number;
  correct: boolean;
  elapsedMs: number;
}

export interface Result {
  signature: string;
  mode: Mode;
  correct: number;
  attempts: number;
  accuracy: number; // 0..1
  totalMs: number;
  avgMs: number;
  longestStreak: number;
}

export const OPERATIONS: Operation[] = ['add', 'sub', 'mul', 'div'];

export const OP_SYMBOL: Record<Operation, string> = {
  add: '+',
  sub: '−',
  mul: '×',
  div: '÷',
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/engine/types.ts
git commit -m "feat: domain types for engine"
```

---

### Task 3: Seeded RNG

**Files:**
- Create: `src/engine/rng.ts`
- Test: `src/engine/rng.test.ts`

**Interfaces:**
- Produces:
  - `mulberry32(seed: number): () => number` — deterministic PRNG in [0, 1).
  - `randInt(rng: () => number, min: number, max: number): number` — inclusive integer.

- [ ] **Step 1: Write the failing test**

`src/engine/rng.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/engine/rng.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

`src/engine/rng.ts`:

```ts
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: () => number, min: number, max: number): number {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return lo + Math.floor(rng() * (hi - lo + 1));
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/engine/rng.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/rng.ts src/engine/rng.test.ts
git commit -m "feat: seeded PRNG (mulberry32) + randInt"
```

---

### Task 4: Problem generation

**Files:**
- Create: `src/engine/problems.ts`
- Test: `src/engine/problems.test.ts`

**Interfaces:**
- Consumes: `mulberry32`, `randInt` (Task 3); `Config`, `Problem`, `Operation`, `OpRange`, `OP_SYMBOL` (Task 2).
- Produces:
  - `PRESET_RANGES: Record<Exclude<Difficulty,'custom'>, Record<Operation, OpRange>>`
  - `rangesForDifficulty(difficulty: Difficulty): Record<Operation, OpRange>` (custom → medium defaults)
  - `makeProblem(op: Operation, config: Config, rng: () => number): Problem`
  - `createProblemGenerator(config: Config): { next: () => Problem }` — deterministic from `config.seed`, never repeats the previous prompt.

- [ ] **Step 1: Write the failing test**

`src/engine/problems.test.ts`:

```ts
import { makeProblem, createProblemGenerator, rangesForDifficulty } from './problems';
import { mulberry32 } from './rng';
import type { Config } from './types';

function cfg(over: Partial<Config> = {}): Config {
  return {
    operations: ['add', 'sub', 'mul', 'div'],
    difficulty: 'medium',
    ranges: rangesForDifficulty('medium'),
    allowNegatives: false,
    mode: 'timed',
    durationSec: 60,
    problemCount: 20,
    seed: 7,
    ...over,
  };
}

test('division always yields whole answers and divisor >= 1', () => {
  const rng = mulberry32(1);
  for (let i = 0; i < 300; i++) {
    const p = makeProblem('div', cfg(), rng);
    expect(p.b).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(p.answer)).toBe(true);
    expect(p.a).toBe(p.b * p.answer);
  }
});

test('subtraction is non-negative when allowNegatives is false', () => {
  const rng = mulberry32(2);
  for (let i = 0; i < 300; i++) {
    const p = makeProblem('sub', cfg({ allowNegatives: false }), rng);
    expect(p.answer).toBeGreaterThanOrEqual(0);
  }
});

test('addition answer equals a + b and prompt uses the operator symbol', () => {
  const rng = mulberry32(3);
  const p = makeProblem('add', cfg(), rng);
  expect(p.answer).toBe(p.a + p.b);
  expect(p.prompt).toContain('+');
});

test('generator is deterministic for a given seed', () => {
  const g1 = createProblemGenerator(cfg({ seed: 555 }));
  const g2 = createProblemGenerator(cfg({ seed: 555 }));
  const s1 = [g1.next(), g1.next(), g1.next()].map((p) => p.prompt);
  const s2 = [g2.next(), g2.next(), g2.next()].map((p) => p.prompt);
  expect(s1).toEqual(s2);
});

test('generator never repeats the immediately previous prompt', () => {
  const g = createProblemGenerator(cfg({ operations: ['add'] }));
  let prev = '';
  for (let i = 0; i < 100; i++) {
    const p = g.next();
    expect(p.prompt).not.toBe(prev);
    prev = p.prompt;
  }
});

test('only enabled operations appear', () => {
  const g = createProblemGenerator(cfg({ operations: ['mul'] }));
  for (let i = 0; i < 50; i++) expect(g.next().op).toBe('mul');
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/engine/problems.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

`src/engine/problems.ts`:

```ts
import { randInt, mulberry32 } from './rng';
import { OP_SYMBOL } from './types';
import type { Config, Difficulty, Operation, OpRange, Problem } from './types';

export const PRESET_RANGES: Record<
  Exclude<Difficulty, 'custom'>,
  Record<Operation, OpRange>
> = {
  easy: {
    add: { min: 1, max: 10 },
    sub: { min: 1, max: 10 },
    mul: { min: 1, max: 10 },
    div: { min: 1, max: 10 },
  },
  medium: {
    add: { min: 1, max: 20 },
    sub: { min: 1, max: 20 },
    mul: { min: 2, max: 12 },
    div: { min: 2, max: 12 },
  },
  hard: {
    add: { min: 1, max: 100 },
    sub: { min: 1, max: 100 },
    mul: { min: 2, max: 20 },
    div: { min: 2, max: 20 },
  },
};

export function rangesForDifficulty(difficulty: Difficulty): Record<Operation, OpRange> {
  if (difficulty === 'custom') return { ...PRESET_RANGES.medium };
  return { ...PRESET_RANGES[difficulty] };
}

export function makeProblem(op: Operation, config: Config, rng: () => number): Problem {
  const r = config.ranges[op];
  let a: number;
  let b: number;
  let answer: number;

  switch (op) {
    case 'add': {
      a = randInt(rng, r.min, r.max);
      b = randInt(rng, r.min, r.max);
      answer = a + b;
      break;
    }
    case 'sub': {
      a = randInt(rng, r.min, r.max);
      b = randInt(rng, r.min, r.max);
      if (!config.allowNegatives && b > a) [a, b] = [b, a];
      answer = a - b;
      break;
    }
    case 'mul': {
      a = randInt(rng, r.min, r.max);
      b = randInt(rng, r.min, r.max);
      answer = a * b;
      break;
    }
    case 'div': {
      const divisor = randInt(rng, Math.max(1, r.min), Math.max(1, r.max));
      const quotient = randInt(rng, r.min, r.max);
      a = divisor * quotient;
      b = divisor;
      answer = quotient;
      break;
    }
  }

  return { a, b, op, answer, prompt: `${a} ${OP_SYMBOL[op]} ${b}` };
}

export function createProblemGenerator(config: Config): { next: () => Problem } {
  const rng = mulberry32(config.seed);
  const ops = config.operations.length > 0 ? config.operations : (['add'] as Operation[]);
  let prevPrompt = '';
  return {
    next(): Problem {
      let p: Problem;
      let guard = 0;
      do {
        const op = ops[randInt(rng, 0, ops.length - 1)];
        p = makeProblem(op, config, rng);
        guard++;
      } while (p.prompt === prevPrompt && guard < 20);
      prevPrompt = p.prompt;
      return p;
    },
  };
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/engine/problems.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/problems.ts src/engine/problems.test.ts
git commit -m "feat: deterministic problem generation with per-op rules"
```

---

### Task 5: Scoring & ranking

**Files:**
- Create: `src/engine/scoring.ts`
- Test: `src/engine/scoring.test.ts`

**Interfaces:**
- Consumes: `Attempt`, `Mode`, `Result` (Task 2).
- Produces:
  - `summarize(attempts: Attempt[], mode: Mode, signature: string): Result`
  - `RankableScore` interface `{ score: number; accuracy: number; total_ms: number }`
  - `compareRank(mode: Mode, x: RankableScore, y: RankableScore): number` — negative if `x` ranks ahead of `y`. Timed: score desc, accuracy desc, total_ms asc. Fixed: score desc, total_ms asc.

- [ ] **Step 1: Write the failing test**

`src/engine/scoring.test.ts`:

```ts
import { summarize, compareRank } from './scoring';
import type { Attempt, Problem } from './types';

const prob: Problem = { a: 1, b: 1, op: 'add', answer: 2, prompt: '1 + 1' };

function att(correct: boolean, ms: number): Attempt {
  return { problem: prob, given: correct ? 2 : 0, correct, elapsedMs: ms };
}

test('summarize computes counts, accuracy, timing, streak', () => {
  const attempts = [att(true, 1000), att(false, 500), att(true, 1000), att(true, 2000)];
  const r = summarize(attempts, 'timed', 'sig');
  expect(r.correct).toBe(3);
  expect(r.attempts).toBe(4);
  expect(r.accuracy).toBeCloseTo(0.75);
  expect(r.totalMs).toBe(4500);
  expect(r.avgMs).toBeCloseTo(4500 / 4);
  expect(r.longestStreak).toBe(2);
  expect(r.signature).toBe('sig');
});

test('summarize handles zero attempts', () => {
  const r = summarize([], 'fixed', 'sig');
  expect(r.correct).toBe(0);
  expect(r.accuracy).toBe(0);
  expect(r.avgMs).toBe(0);
});

test('timed ranking: higher score first, then accuracy, then faster', () => {
  expect(compareRank('timed', { score: 20, accuracy: 0.9, total_ms: 60000 },
                              { score: 18, accuracy: 1, total_ms: 60000 })).toBeLessThan(0);
  expect(compareRank('timed', { score: 20, accuracy: 0.8, total_ms: 60000 },
                              { score: 20, accuracy: 0.95, total_ms: 60000 })).toBeGreaterThan(0);
});

test('fixed ranking: higher score first, then faster total time', () => {
  expect(compareRank('fixed', { score: 20, accuracy: 1, total_ms: 30000 },
                              { score: 20, accuracy: 1, total_ms: 45000 })).toBeLessThan(0);
  expect(compareRank('fixed', { score: 19, accuracy: 1, total_ms: 10000 },
                              { score: 20, accuracy: 1, total_ms: 90000 })).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/engine/scoring.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

`src/engine/scoring.ts`:

```ts
import type { Attempt, Mode, Result } from './types';

export interface RankableScore {
  score: number;
  accuracy: number;
  total_ms: number;
}

export function summarize(attempts: Attempt[], mode: Mode, signature: string): Result {
  const total = attempts.length;
  let correct = 0;
  let totalMs = 0;
  let streak = 0;
  let longestStreak = 0;

  for (const a of attempts) {
    totalMs += a.elapsedMs;
    if (a.correct) {
      correct++;
      streak++;
      if (streak > longestStreak) longestStreak = streak;
    } else {
      streak = 0;
    }
  }

  return {
    signature,
    mode,
    correct,
    attempts: total,
    accuracy: total === 0 ? 0 : correct / total,
    totalMs,
    avgMs: total === 0 ? 0 : totalMs / total,
    longestStreak,
  };
}

export function compareRank(mode: Mode, x: RankableScore, y: RankableScore): number {
  if (x.score !== y.score) return y.score - x.score;
  if (mode === 'timed') {
    if (x.accuracy !== y.accuracy) return y.accuracy - x.accuracy;
    return x.total_ms - y.total_ms;
  }
  return x.total_ms - y.total_ms;
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/engine/scoring.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/scoring.ts src/engine/scoring.test.ts
git commit -m "feat: scoring summary + mode-aware ranking"
```

---

### Task 6: Mode signature & challenge-link codec

**Files:**
- Create: `src/engine/signature.ts`
- Test: `src/engine/signature.test.ts`

**Interfaces:**
- Consumes: `Config`, `Operation`, `OPERATIONS` (Task 2).
- Produces:
  - `modeSignature(config: Config): string` — canonical, seed-independent, operation-order-independent.
  - `encodeChallenge(config: Config): string` — base64url of full config (incl. seed).
  - `decodeChallenge(param: string): Config | null` — returns null on malformed/oversized input.

- [ ] **Step 1: Write the failing test**

`src/engine/signature.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/engine/signature.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

`src/engine/signature.ts`:

```ts
import { OPERATIONS } from './types';
import type { Config, Operation } from './types';

function toBase64Url(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return decodeURIComponent(escape(atob(b64)));
}

function sortedOps(operations: Operation[]): Operation[] {
  return OPERATIONS.filter((op) => operations.includes(op));
}

export function modeSignature(config: Config): string {
  const ops = sortedOps(config.operations).join('');
  const length =
    config.mode === 'timed' ? `t${config.durationSec}` : `f${config.problemCount}`;
  let diff = config.difficulty as string;
  if (config.difficulty === 'custom') {
    const ranges = sortedOps(config.operations)
      .map((op) => `${op}:${config.ranges[op].min}-${config.ranges[op].max}`)
      .join(',');
    diff = `custom(${ranges})`;
  }
  const neg = config.allowNegatives ? 'neg' : 'pos';
  return `${ops}|${diff}|${length}|${neg}`;
}

const MAX_PARAM_LENGTH = 2000;

export function encodeChallenge(config: Config): string {
  return toBase64Url(JSON.stringify(config));
}

export function decodeChallenge(param: string): Config | null {
  if (!param || param.length > MAX_PARAM_LENGTH) return null;
  try {
    const json = fromBase64Url(param);
    const obj = JSON.parse(json) as Config;
    if (!Array.isArray(obj.operations) || obj.operations.length === 0) return null;
    if (obj.mode !== 'timed' && obj.mode !== 'fixed') return null;
    if (typeof obj.seed !== 'number' || !obj.ranges) return null;
    return obj;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/engine/signature.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/signature.ts src/engine/signature.test.ts
git commit -m "feat: mode signature + challenge-link codec"
```

---

### Task 7: ScoreStore interface + LocalStore

**Files:**
- Create: `src/storage/ScoreStore.ts`, `src/storage/LocalStore.ts`
- Test: `src/storage/LocalStore.test.ts`

**Interfaces:**
- Consumes: `Mode` (Task 2), `compareRank` + `RankableScore` (Task 5).
- Produces:
  - `ScoreRow`, `SubmitScoreInput`, `ScoreStore` interface (below).
  - `LocalStore implements ScoreStore` with `isRemote = false`; persists to `localStorage` under key `hvmnd:scores`.

```ts
// ScoreStore.ts contents
export interface ScoreRow {
  id: string;
  signature: string;
  display_name: string;
  score: number;
  accuracy: number;
  total_ms: number;
  mode: Mode;
  created_at: string;
}
export interface SubmitScoreInput {
  signature: string;
  display_name: string;
  score: number;
  accuracy: number;
  total_ms: number;
  mode: Mode;
}
export interface ScoreStore {
  readonly isRemote: boolean;
  submitScore(input: SubmitScoreInput): Promise<ScoreRow>;
  getLeaderboard(signature: string, mode: Mode, limit?: number): Promise<ScoreRow[]>;
  getPersonalBest(signature: string, mode: Mode): Promise<ScoreRow | null>;
  subscribeLeaderboard(signature: string, mode: Mode, cb: (row: ScoreRow) => void): () => void;
}
```

- [ ] **Step 1: Write the failing test**

`src/storage/LocalStore.test.ts`:

```ts
import { beforeEach, test, expect } from 'vitest';
import { LocalStore } from './LocalStore';

beforeEach(() => localStorage.clear());

test('submitScore stores and getLeaderboard returns ranked rows', async () => {
  const s = new LocalStore();
  await s.submitScore({ signature: 'sig', display_name: 'A', score: 10, accuracy: 1, total_ms: 60000, mode: 'timed' });
  await s.submitScore({ signature: 'sig', display_name: 'B', score: 20, accuracy: 1, total_ms: 60000, mode: 'timed' });
  const board = await s.getLeaderboard('sig', 'timed');
  expect(board.map((r) => r.display_name)).toEqual(['B', 'A']);
});

test('getPersonalBest returns the best row for the signature', async () => {
  const s = new LocalStore();
  await s.submitScore({ signature: 'sig', display_name: 'A', score: 10, accuracy: 1, total_ms: 60000, mode: 'timed' });
  await s.submitScore({ signature: 'sig', display_name: 'A', score: 25, accuracy: 1, total_ms: 60000, mode: 'timed' });
  const best = await s.getPersonalBest('sig', 'timed');
  expect(best?.score).toBe(25);
});

test('leaderboard is scoped by signature', async () => {
  const s = new LocalStore();
  await s.submitScore({ signature: 'sig1', display_name: 'A', score: 10, accuracy: 1, total_ms: 1, mode: 'timed' });
  await s.submitScore({ signature: 'sig2', display_name: 'B', score: 99, accuracy: 1, total_ms: 1, mode: 'timed' });
  const board = await s.getLeaderboard('sig1', 'timed');
  expect(board).toHaveLength(1);
  expect(board[0].display_name).toBe('A');
});

test('subscribeLeaderboard fires callback on new submit and unsubscribes cleanly', async () => {
  const s = new LocalStore();
  const seen: string[] = [];
  const unsub = s.subscribeLeaderboard('sig', 'timed', (row) => seen.push(row.display_name));
  await s.submitScore({ signature: 'sig', display_name: 'A', score: 10, accuracy: 1, total_ms: 1, mode: 'timed' });
  expect(seen).toEqual(['A']);
  unsub();
  await s.submitScore({ signature: 'sig', display_name: 'B', score: 10, accuracy: 1, total_ms: 1, mode: 'timed' });
  expect(seen).toEqual(['A']);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/storage/LocalStore.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the interface and implementation**

`src/storage/ScoreStore.ts`:

```ts
import type { Mode } from '../engine/types';

export interface ScoreRow {
  id: string;
  signature: string;
  display_name: string;
  score: number;
  accuracy: number;
  total_ms: number;
  mode: Mode;
  created_at: string;
}

export interface SubmitScoreInput {
  signature: string;
  display_name: string;
  score: number;
  accuracy: number;
  total_ms: number;
  mode: Mode;
}

export interface ScoreStore {
  readonly isRemote: boolean;
  submitScore(input: SubmitScoreInput): Promise<ScoreRow>;
  getLeaderboard(signature: string, mode: Mode, limit?: number): Promise<ScoreRow[]>;
  getPersonalBest(signature: string, mode: Mode): Promise<ScoreRow | null>;
  subscribeLeaderboard(
    signature: string,
    mode: Mode,
    cb: (row: ScoreRow) => void,
  ): () => void;
}
```

`src/storage/LocalStore.ts`:

```ts
import { compareRank } from '../engine/scoring';
import type { Mode } from '../engine/types';
import type { ScoreRow, ScoreStore, SubmitScoreInput } from './ScoreStore';

const KEY = 'hvmnd:scores';

type Listener = { signature: string; mode: Mode; cb: (row: ScoreRow) => void };

export class LocalStore implements ScoreStore {
  readonly isRemote = false;
  private listeners: Listener[] = [];

  private readAll(): ScoreRow[] {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as ScoreRow[]) : [];
    } catch {
      return [];
    }
  }

  private writeAll(rows: ScoreRow[]): void {
    localStorage.setItem(KEY, JSON.stringify(rows));
  }

  async submitScore(input: SubmitScoreInput): Promise<ScoreRow> {
    const row: ScoreRow = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...input,
    };
    const rows = this.readAll();
    rows.push(row);
    this.writeAll(rows);
    for (const l of this.listeners) {
      if (l.signature === row.signature && l.mode === row.mode) l.cb(row);
    }
    return row;
  }

  async getLeaderboard(signature: string, mode: Mode, limit = 50): Promise<ScoreRow[]> {
    return this.readAll()
      .filter((r) => r.signature === signature && r.mode === mode)
      .sort((a, b) => compareRank(mode, a, b))
      .slice(0, limit);
  }

  async getPersonalBest(signature: string, mode: Mode): Promise<ScoreRow | null> {
    const board = await this.getLeaderboard(signature, mode, 1);
    return board[0] ?? null;
  }

  subscribeLeaderboard(
    signature: string,
    mode: Mode,
    cb: (row: ScoreRow) => void,
  ): () => void {
    const listener: Listener = { signature, mode, cb };
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/storage/LocalStore.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/storage/ScoreStore.ts src/storage/LocalStore.ts src/storage/LocalStore.test.ts
git commit -m "feat: ScoreStore interface + localStorage implementation"
```

---

### Task 8: SupabaseStore + store selector

**Files:**
- Create: `src/storage/supabaseClient.ts`, `src/storage/SupabaseStore.ts`, `src/storage/index.ts`
- Test: `src/storage/SupabaseStore.test.ts`

**Interfaces:**
- Consumes: `ScoreStore`, `ScoreRow`, `SubmitScoreInput` (Task 7); `compareRank` (Task 5); `Mode` (Task 2).
- Produces:
  - `getSupabase(): SupabaseClient | null` — null when env vars absent.
  - `SupabaseStore implements ScoreStore` (`isRemote = true`), constructed with an injected client (so it is testable with a mock).
  - `getScoreStore(): ScoreStore` — returns `SupabaseStore` when configured, else `LocalStore`. `export const isRemoteConfigured: boolean`.

- [ ] **Step 1: Write the failing test (with an injected fake client)**

`src/storage/SupabaseStore.test.ts`:

```ts
import { test, expect, vi } from 'vitest';
import { SupabaseStore } from './SupabaseStore';

function fakeClient(rows: any[]) {
  return {
    from() {
      return {
        insert(vals: any[]) {
          const inserted = { id: 'x', created_at: 'now', ...vals[0] };
          rows.push(inserted);
          return {
            select() {
              return { single: async () => ({ data: inserted, error: null }) };
            },
          };
        },
        select() {
          const chain = {
            _sig: '',
            eq(_col: string, val: string) {
              if (!chain._sig) chain._sig = val;
              return chain;
            },
            order() { return chain; },
            limit: async () => ({ data: rows.filter((r) => r.signature === chain._sig), error: null }),
          };
          return chain;
        },
      };
    },
    channel() {
      return { on() { return this; }, subscribe() { return this; } };
    },
    removeChannel() {},
  } as any;
}

test('submitScore inserts and returns the row', async () => {
  const rows: any[] = [];
  const store = new SupabaseStore(fakeClient(rows));
  const row = await store.submitScore({
    signature: 'sig', display_name: 'A', score: 10, accuracy: 1, total_ms: 1, mode: 'timed',
  });
  expect(row.display_name).toBe('A');
  expect(rows).toHaveLength(1);
});

test('getLeaderboard filters by signature', async () => {
  const rows = [
    { id: '1', signature: 'sig', display_name: 'A', score: 10, accuracy: 1, total_ms: 1, mode: 'timed', created_at: 'now' },
    { id: '2', signature: 'other', display_name: 'B', score: 99, accuracy: 1, total_ms: 1, mode: 'timed', created_at: 'now' },
  ];
  const store = new SupabaseStore(fakeClient(rows));
  const board = await store.getLeaderboard('sig', 'timed');
  expect(board).toHaveLength(1);
  expect(board[0].display_name).toBe('A');
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/storage/SupabaseStore.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the client, store, and selector**

`src/storage/supabaseClient.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isRemoteConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isRemoteConfigured) return null;
  if (!client) client = createClient(url as string, anonKey as string);
  return client;
}
```

`src/storage/SupabaseStore.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { compareRank } from '../engine/scoring';
import type { Mode } from '../engine/types';
import type { ScoreRow, ScoreStore, SubmitScoreInput } from './ScoreStore';

const TABLE = 'scores';

export class SupabaseStore implements ScoreStore {
  readonly isRemote = true;
  constructor(private client: SupabaseClient) {}

  async submitScore(input: SubmitScoreInput): Promise<ScoreRow> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert([input])
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'submit failed');
    return data as ScoreRow;
  }

  async getLeaderboard(signature: string, mode: Mode, limit = 50): Promise<ScoreRow[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select('*')
      .eq('signature', signature)
      .eq('mode', mode)
      .order('score', { ascending: false })
      .limit(limit);
    if (error || !data) throw new Error(error?.message ?? 'leaderboard failed');
    return (data as ScoreRow[]).slice().sort((a, b) => compareRank(mode, a, b));
  }

  async getPersonalBest(signature: string, mode: Mode): Promise<ScoreRow | null> {
    const board = await this.getLeaderboard(signature, mode, 1);
    return board[0] ?? null;
  }

  subscribeLeaderboard(
    signature: string,
    mode: Mode,
    cb: (row: ScoreRow) => void,
  ): () => void {
    const channel = this.client
      .channel(`scores:${signature}:${mode}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: TABLE, filter: `signature=eq.${signature}` },
        (payload: { new: ScoreRow }) => {
          if (payload.new.mode === mode) cb(payload.new);
        },
      )
      .subscribe();
    return () => {
      this.client.removeChannel(channel);
    };
  }
}
```

`src/storage/index.ts`:

```ts
import { LocalStore } from './LocalStore';
import { SupabaseStore } from './SupabaseStore';
import { getSupabase, isRemoteConfigured } from './supabaseClient';
import type { ScoreStore } from './ScoreStore';

export { isRemoteConfigured };
export type { ScoreRow, SubmitScoreInput, ScoreStore } from './ScoreStore';

let store: ScoreStore | null = null;

export function getScoreStore(): ScoreStore {
  if (store) return store;
  const client = getSupabase();
  store = client ? new SupabaseStore(client) : new LocalStore();
  return store;
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/storage/SupabaseStore.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/storage/supabaseClient.ts src/storage/SupabaseStore.ts src/storage/index.ts src/storage/SupabaseStore.test.ts
git commit -m "feat: Supabase-backed store + local/remote selector"
```

---

### Task 9: Preferences & timer hooks

**Files:**
- Create: `src/hooks/usePreferences.ts`, `src/hooks/useTimer.ts`
- Test: `src/hooks/useTimer.test.ts`

**Interfaces:**
- Produces:
  - `usePreferences(): { prefs: Preferences; setPrefs: (p: Partial<Preferences>) => void }` where `Preferences = { theme: 'light'|'dark'; sound: boolean; numpad: boolean }`. Persists to `localStorage` key `hvmnd:prefs`; applies/removes `dark` class on `<html>`.
  - `useTimer(durationSec: number, running: boolean): { remainingMs: number; done: boolean; reset: () => void }` — counts down while `running`; `done` true at 0.

- [ ] **Step 1: Write the failing test**

`src/hooks/useTimer.test.ts`:

```ts
import { test, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from './useTimer';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('counts down while running and reports done at zero', () => {
  const { result } = renderHook(() => useTimer(1, true));
  expect(result.current.remainingMs).toBe(1000);
  act(() => { vi.advanceTimersByTime(1000); });
  expect(result.current.remainingMs).toBe(0);
  expect(result.current.done).toBe(true);
});

test('does not advance while paused', () => {
  const { result } = renderHook(() => useTimer(2, false));
  act(() => { vi.advanceTimersByTime(1000); });
  expect(result.current.remainingMs).toBe(2000);
  expect(result.current.done).toBe(false);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/hooks/useTimer.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the hooks**

`src/hooks/useTimer.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimer(durationSec: number, running: boolean) {
  const [remainingMs, setRemainingMs] = useState(durationSec * 1000);
  const endRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    endRef.current = null;
    setRemainingMs(durationSec * 1000);
  }, [durationSec]);

  useEffect(() => {
    if (!running) {
      endRef.current = null;
      return;
    }
    endRef.current = Date.now() + remainingMs;
    const id = setInterval(() => {
      const left = Math.max(0, (endRef.current ?? 0) - Date.now());
      setRemainingMs(left);
      if (left <= 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  return { remainingMs, done: remainingMs <= 0, reset };
}
```

`src/hooks/usePreferences.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';

export interface Preferences {
  theme: 'light' | 'dark';
  sound: boolean;
  numpad: boolean;
}

const KEY = 'hvmnd:prefs';

function initialPrefs(): Preferences {
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const fallback: Preferences = {
    theme: prefersDark ? 'dark' : 'light',
    sound: true,
    numpad: true,
  };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Preferences>) } : fallback;
  } catch {
    return fallback;
  }
}

export function usePreferences() {
  const [prefs, setState] = useState<Preferences>(initialPrefs);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(prefs));
    document.documentElement.classList.toggle('dark', prefs.theme === 'dark');
  }, [prefs]);

  const setPrefs = useCallback((patch: Partial<Preferences>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  return { prefs, setPrefs };
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/hooks/useTimer.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePreferences.ts src/hooks/useTimer.ts src/hooks/useTimer.test.ts
git commit -m "feat: preferences + countdown timer hooks"
```

---

### Task 10: Game engine hook

**Files:**
- Create: `src/hooks/useGameEngine.ts`
- Test: `src/hooks/useGameEngine.test.ts`

**Interfaces:**
- Consumes: `createProblemGenerator` (Task 4), `summarize` (Task 5), `modeSignature` (Task 6); `Config`, `Attempt`, `Problem`, `Result` (Task 2).
- Produces: `useGameEngine(config: Config)` returning:
  - `current: Problem | null`, `input: string`, `setInput(v: string)`,
  - `submit(): void` — records an `Attempt` (correct = parsed input === answer), advances; in `fixed` mode auto-finishes after `problemCount` attempts,
  - `start(): void`, `finish(): void`, `started: boolean`, `finished: boolean`,
  - `attempts: Attempt[]`, `result: Result | null` (set on finish), `count: number` (attempts so far).

- [ ] **Step 1: Write the failing test**

`src/hooks/useGameEngine.test.ts`:

```ts
import { test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameEngine } from './useGameEngine';
import { rangesForDifficulty } from '../engine/problems';
import type { Config } from '../engine/types';

function cfg(over: Partial<Config> = {}): Config {
  return {
    operations: ['add'],
    difficulty: 'easy',
    ranges: rangesForDifficulty('easy'),
    allowNegatives: false,
    mode: 'fixed',
    durationSec: 60,
    problemCount: 3,
    seed: 1,
    ...over,
  };
}

test('correct submit advances and increments correct count', () => {
  const { result } = renderHook(() => useGameEngine(cfg()));
  act(() => result.current.start());
  const answer = result.current.current!.answer;
  act(() => result.current.setInput(String(answer)));
  act(() => result.current.submit());
  expect(result.current.attempts[0].correct).toBe(true);
  expect(result.current.count).toBe(1);
});

test('wrong submit counts as incorrect and still advances', () => {
  const { result } = renderHook(() => useGameEngine(cfg()));
  act(() => result.current.start());
  const wrong = result.current.current!.answer + 1;
  act(() => result.current.setInput(String(wrong)));
  act(() => result.current.submit());
  expect(result.current.attempts[0].correct).toBe(false);
  expect(result.current.count).toBe(1);
});

test('fixed mode finishes after problemCount attempts and produces a result', () => {
  const { result } = renderHook(() => useGameEngine(cfg({ problemCount: 2 })));
  act(() => result.current.start());
  for (let i = 0; i < 2; i++) {
    const a = result.current.current!.answer;
    act(() => result.current.setInput(String(a)));
    act(() => result.current.submit());
  }
  expect(result.current.finished).toBe(true);
  expect(result.current.result?.correct).toBe(2);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/hooks/useGameEngine.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the hook**

`src/hooks/useGameEngine.ts`:

```ts
import { useCallback, useMemo, useRef, useState } from 'react';
import { createProblemGenerator } from '../engine/problems';
import { summarize } from '../engine/scoring';
import { modeSignature } from '../engine/signature';
import type { Attempt, Config, Problem, Result } from '../engine/types';

export function useGameEngine(config: Config) {
  const gen = useMemo(() => createProblemGenerator(config), [config]);
  const [current, setCurrent] = useState<Problem | null>(null);
  const [input, setInput] = useState('');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const problemStart = useRef<number>(0);

  const finish = useCallback(
    (finalAttempts: Attempt[]) => {
      setFinished(true);
      setStarted(false);
      setResult(summarize(finalAttempts, config.mode, modeSignature(config)));
    },
    [config],
  );

  const start = useCallback(() => {
    setAttempts([]);
    setResult(null);
    setFinished(false);
    setStarted(true);
    setInput('');
    setCurrent(gen.next());
    problemStart.current = Date.now();
  }, [gen]);

  const submit = useCallback(() => {
    if (!started || !current || input.trim() === '') return;
    const given = Number(input);
    const attempt: Attempt = {
      problem: current,
      given,
      correct: given === current.answer,
      elapsedMs: Date.now() - problemStart.current,
    };
    const nextAttempts = [...attempts, attempt];
    setAttempts(nextAttempts);
    setInput('');

    if (config.mode === 'fixed' && nextAttempts.length >= config.problemCount) {
      finish(nextAttempts);
      return;
    }
    setCurrent(gen.next());
    problemStart.current = Date.now();
  }, [started, current, input, attempts, config, gen, finish]);

  const finishNow = useCallback(() => finish(attempts), [finish, attempts]);

  return {
    current,
    input,
    setInput,
    submit,
    start,
    finish: finishNow,
    started,
    finished,
    attempts,
    result,
    count: attempts.length,
  };
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/hooks/useGameEngine.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useGameEngine.ts src/hooks/useGameEngine.test.ts
git commit -m "feat: game engine hook (problem flow + scoring)"
```

---

### Task 11: Presentational components

**Files:**
- Create: `src/components/ProblemDisplay.tsx`, `src/components/TimerBar.tsx`, `src/components/OperationToggle.tsx`, `src/components/Numpad.tsx`
- Test: `src/components/Numpad.test.tsx`

**Interfaces:**
- Consumes: `Operation`, `OP_SYMBOL` (Task 2).
- Produces:
  - `ProblemDisplay({ prompt }: { prompt: string })`
  - `TimerBar({ remainingMs, totalMs }: { remainingMs: number; totalMs: number })`
  - `OperationToggle({ op, active, onToggle }: { op: Operation; active: boolean; onToggle: (op: Operation) => void })`
  - `Numpad({ onDigit, onClear, onSubmit }: { onDigit: (d: string) => void; onClear: () => void; onSubmit: () => void })`

- [ ] **Step 1: Write the failing test**

`src/components/Numpad.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Numpad } from './Numpad';

test('numpad reports digit, clear, and submit presses', async () => {
  const onDigit = vi.fn();
  const onClear = vi.fn();
  const onSubmit = vi.fn();
  render(<Numpad onDigit={onDigit} onClear={onClear} onSubmit={onSubmit} />);
  await userEvent.click(screen.getByRole('button', { name: '7' }));
  expect(onDigit).toHaveBeenCalledWith('7');
  await userEvent.click(screen.getByRole('button', { name: /clear/i }));
  expect(onClear).toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: /enter/i }));
  expect(onSubmit).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/components/Numpad.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the components**

`src/components/ProblemDisplay.tsx`:

```tsx
export function ProblemDisplay({ prompt }: { prompt: string }) {
  return (
    <div className="text-center font-mono tabular-nums text-5xl sm:text-7xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
      {prompt}
    </div>
  );
}
```

`src/components/TimerBar.tsx`:

```tsx
export function TimerBar({ remainingMs, totalMs }: { remainingMs: number; totalMs: number }) {
  const pct = totalMs > 0 ? Math.max(0, Math.min(100, (remainingMs / totalMs) * 100)) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  return (
    <div className="w-full">
      <div className="mb-1 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
        {seconds}s
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-indigo-500 transition-[width] duration-100 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

`src/components/OperationToggle.tsx`:

```tsx
import { OP_SYMBOL, type Operation } from '../engine/types';

const LABEL: Record<Operation, string> = {
  add: 'Addition',
  sub: 'Subtraction',
  mul: 'Multiplication',
  div: 'Division',
};

export function OperationToggle({
  op,
  active,
  onToggle,
}: {
  op: Operation;
  active: boolean;
  onToggle: (op: Operation) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={LABEL[op]}
      onClick={() => onToggle(op)}
      className={`flex h-16 items-center justify-center rounded-xl text-3xl font-bold transition ${
        active
          ? 'bg-indigo-600 text-white shadow'
          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      }`}
    >
      {OP_SYMBOL[op]}
    </button>
  );
}
```

`src/components/Numpad.tsx`:

```tsx
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'enter'] as const;

export function Numpad({
  onDigit,
  onClear,
  onSubmit,
}: {
  onDigit: (d: string) => void;
  onClear: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 select-none">
      {KEYS.map((k) => {
        if (k === 'clear') {
          return (
            <button key={k} type="button" aria-label="Clear" onClick={onClear}
              className="h-16 rounded-xl bg-slate-200 text-lg font-semibold text-slate-700 active:scale-95 dark:bg-slate-700 dark:text-slate-200">
              ⌫
            </button>
          );
        }
        if (k === 'enter') {
          return (
            <button key={k} type="button" aria-label="Enter" onClick={onSubmit}
              className="h-16 rounded-xl bg-indigo-600 text-lg font-semibold text-white active:scale-95">
              ⏎
            </button>
          );
        }
        return (
          <button key={k} type="button" aria-label={k} onClick={() => onDigit(k)}
            className="h-16 rounded-xl bg-white text-2xl font-semibold text-slate-900 shadow-sm active:scale-95 dark:bg-slate-800 dark:text-slate-100">
            {k}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/components/Numpad.test.tsx`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/
git commit -m "feat: presentational components (problem, timer, numpad, op toggle)"
```

---

### Task 12: ConfigScreen

**Files:**
- Create: `src/screens/ConfigScreen.tsx`
- Test: `src/screens/ConfigScreen.test.tsx`

**Interfaces:**
- Consumes: `OperationToggle` (Task 11); `rangesForDifficulty`, `PRESET_RANGES` (Task 4); `Config`, `Operation`, `Difficulty`, `Mode`, `OPERATIONS` (Task 2); `Preferences` (Task 9).
- Produces: `defaultConfig(): Config`; `ConfigScreen({ initial, prefs, setPrefs, onStart }: { initial: Config; prefs: Preferences; setPrefs: (p: Partial<Preferences>) => void; onStart: (config: Config) => void })`. Start is disabled when no operations are selected. Each start generates a fresh random `seed`.

- [ ] **Step 1: Write the failing test**

`src/screens/ConfigScreen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigScreen, defaultConfig } from './ConfigScreen';

const prefs = { theme: 'light' as const, sound: true, numpad: true };

test('start is disabled when no operations selected, enabled otherwise', async () => {
  const onStart = vi.fn();
  const initial = { ...defaultConfig(), operations: [] };
  render(<ConfigScreen initial={initial} prefs={prefs} setPrefs={() => {}} onStart={onStart} />);
  const start = screen.getByRole('button', { name: /start/i });
  expect(start).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: /addition/i }));
  expect(start).toBeEnabled();
});

test('clicking start emits a config with the chosen operations', async () => {
  const onStart = vi.fn();
  render(<ConfigScreen initial={defaultConfig()} prefs={prefs} setPrefs={() => {}} onStart={onStart} />);
  await userEvent.click(screen.getByRole('button', { name: /start/i }));
  expect(onStart).toHaveBeenCalledTimes(1);
  expect(onStart.mock.calls[0][0].operations.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/screens/ConfigScreen.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the screen**

`src/screens/ConfigScreen.tsx`:

```tsx
import { useState } from 'react';
import { OperationToggle } from '../components/OperationToggle';
import { rangesForDifficulty } from '../engine/problems';
import { OPERATIONS, type Config, type Difficulty, type Mode, type Operation } from '../engine/types';
import type { Preferences } from '../hooks/usePreferences';

export function defaultConfig(): Config {
  return {
    operations: ['add', 'sub', 'mul', 'div'],
    difficulty: 'medium',
    ranges: rangesForDifficulty('medium'),
    allowNegatives: false,
    mode: 'timed',
    durationSec: 60,
    problemCount: 20,
    seed: Math.floor(Math.random() * 2 ** 31),
  };
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const DURATIONS = [30, 60, 120];
const COUNTS = [10, 20, 50];

export function ConfigScreen({
  initial,
  prefs,
  setPrefs,
  onStart,
}: {
  initial: Config;
  prefs: Preferences;
  setPrefs: (p: Partial<Preferences>) => void;
  onStart: (config: Config) => void;
}) {
  const [config, setConfig] = useState<Config>(initial);
  const canStart = config.operations.length > 0;

  const toggleOp = (op: Operation) => {
    setConfig((c) => ({
      ...c,
      operations: c.operations.includes(op)
        ? c.operations.filter((o) => o !== op)
        : [...c.operations, op],
    }));
  };

  const pickDifficulty = (d: Difficulty) =>
    setConfig((c) => ({ ...c, difficulty: d, ranges: rangesForDifficulty(d) }));

  const start = () =>
    onStart({ ...config, seed: Math.floor(Math.random() * 2 ** 31) });

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">hvmnd</h1>
        <button
          type="button"
          aria-label="Toggle theme"
          onClick={() => setPrefs({ theme: prefs.theme === 'dark' ? 'light' : 'dark' })}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800 dark:text-slate-200"
        >
          {prefs.theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Operations</h2>
        <div className="grid grid-cols-4 gap-2">
          {OPERATIONS.map((op) => (
            <OperationToggle key={op} op={op} active={config.operations.includes(op)} onToggle={toggleOp} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Difficulty</h2>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map((d) => (
            <button key={d} type="button" onClick={() => pickDifficulty(d)}
              className={`h-11 rounded-lg text-sm font-semibold capitalize ${
                config.difficulty === d ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}>
              {d}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Mode</h2>
        <div className="mb-2 grid grid-cols-2 gap-2">
          {(['timed', 'fixed'] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => setConfig((c) => ({ ...c, mode: m }))}
              className={`h-11 rounded-lg text-sm font-semibold ${
                config.mode === m ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}>
              {m === 'timed' ? 'Timed' : 'Fixed count'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(config.mode === 'timed' ? DURATIONS : COUNTS).map((v) => {
            const active = config.mode === 'timed' ? config.durationSec === v : config.problemCount === v;
            return (
              <button key={v} type="button"
                onClick={() =>
                  setConfig((c) => (c.mode === 'timed' ? { ...c, durationSec: v } : { ...c, problemCount: v }))
                }
                className={`h-11 rounded-lg text-sm font-semibold ${
                  active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}>
                {config.mode === 'timed' ? `${v}s` : `${v}`}
              </button>
            );
          })}
        </div>
      </section>

      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input type="checkbox" checked={config.allowNegatives}
          onChange={(e) => setConfig((c) => ({ ...c, allowNegatives: e.target.checked }))} />
        Allow negative results in subtraction
      </label>

      <button type="button" disabled={!canStart} onClick={start}
        className="h-14 rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-lg disabled:opacity-40">
        Start
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/screens/ConfigScreen.test.tsx`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ConfigScreen.tsx src/screens/ConfigScreen.test.tsx
git commit -m "feat: config screen with operations/difficulty/mode/prefs"
```

---

### Task 13: TrialScreen

**Files:**
- Create: `src/screens/TrialScreen.tsx`
- Test: `src/screens/TrialScreen.test.tsx`

**Interfaces:**
- Consumes: `useGameEngine` (Task 10), `useTimer` (Task 9), `ProblemDisplay`/`TimerBar`/`Numpad` (Task 11); `Config`, `Result`, `Preferences`.
- Produces: `TrialScreen({ config, prefs, onFinish }: { config: Config; prefs: Preferences; onFinish: (result: Result) => void })`. On mount it starts the engine; in timed mode it wires the countdown and calls the engine's `finish` at zero; on finish (either mode) it invokes `onFinish` with the result. Physical keyboard: digits type, Backspace clears one, Enter submits.

- [ ] **Step 1: Write the failing test**

`src/screens/TrialScreen.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrialScreen } from './TrialScreen';
import { defaultConfig } from './ConfigScreen';

const prefs = { theme: 'light' as const, sound: false, numpad: true };

test('fixed-count trial finishes and reports a result', async () => {
  const config = { ...defaultConfig(), operations: ['add'] as const, mode: 'fixed' as const, problemCount: 1 };
  const onFinish = vi.fn();
  render(<TrialScreen config={config} prefs={prefs} onFinish={onFinish} />);
  // read the shown prompt, compute the answer, submit via keyboard
  const promptEl = await screen.findByTestId('prompt');
  const [a, , b] = promptEl.textContent!.split(' ');
  await userEvent.keyboard(`${Number(a) + Number(b)}{Enter}`);
  await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
  expect(onFinish.mock.calls[0][0].correct).toBe(1);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/screens/TrialScreen.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the screen**

`src/screens/TrialScreen.tsx`:

```tsx
import { useEffect } from 'react';
import { Numpad } from '../components/Numpad';
import { ProblemDisplay } from '../components/ProblemDisplay';
import { TimerBar } from '../components/TimerBar';
import { useGameEngine } from '../hooks/useGameEngine';
import { useTimer } from '../hooks/useTimer';
import type { Config, Result } from '../engine/types';
import type { Preferences } from '../hooks/usePreferences';

export function TrialScreen({
  config,
  prefs,
  onFinish,
}: {
  config: Config;
  prefs: Preferences;
  onFinish: (result: Result) => void;
}) {
  const engine = useGameEngine(config);
  const timer = useTimer(config.durationSec, engine.started && config.mode === 'timed');

  useEffect(() => {
    engine.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (config.mode === 'timed' && timer.done && engine.started) engine.finish();
  }, [config.mode, timer.done, engine]);

  useEffect(() => {
    if (engine.finished && engine.result) onFinish(engine.result);
  }, [engine.finished, engine.result, onFinish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') engine.setInput(engine.input + e.key);
      else if (e.key === 'Backspace') engine.setInput(engine.input.slice(0, -1));
      else if (e.key === 'Enter') engine.submit();
      else if (e.key === '-') engine.setInput(engine.input.startsWith('-') ? engine.input.slice(1) : '-' + engine.input);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine]);

  const total = config.mode === 'timed' ? config.durationSec * 1000 : 0;
  const progress =
    config.mode === 'timed'
      ? `${engine.count} solved`
      : `${engine.count} / ${config.problemCount}`;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col gap-6 p-4">
      {config.mode === 'timed' ? (
        <TimerBar remainingMs={timer.remainingMs} totalMs={total} />
      ) : (
        <div className="text-center text-sm font-medium text-slate-500">{progress}</div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div data-testid="prompt">
          <ProblemDisplay prompt={engine.current?.prompt ?? ''} />
        </div>
        <div className="h-14 min-w-[8rem] rounded-xl border-2 border-slate-300 px-4 text-center text-4xl font-bold leading-[3.25rem] text-slate-900 dark:border-slate-600 dark:text-slate-50">
          {engine.input || ' '}
        </div>
        {config.mode === 'timed' && (
          <div className="text-sm font-medium text-slate-500">{progress}</div>
        )}
      </div>

      {prefs.numpad && (
        <Numpad
          onDigit={(d) => engine.setInput(engine.input + d)}
          onClear={() => engine.setInput(engine.input.slice(0, -1))}
          onSubmit={engine.submit}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/screens/TrialScreen.test.tsx`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/TrialScreen.tsx src/screens/TrialScreen.test.tsx
git commit -m "feat: trial screen with timer, keyboard, and numpad input"
```

---

### Task 14: LeaderboardScreen

**Files:**
- Create: `src/hooks/useLeaderboard.ts`, `src/screens/LeaderboardScreen.tsx`
- Test: `src/screens/LeaderboardScreen.test.tsx`

**Interfaces:**
- Consumes: `getScoreStore`, `ScoreRow` (Task 8); `compareRank` (Task 5); `Mode` (Task 2).
- Produces:
  - `useLeaderboard(signature: string, mode: Mode): { rows: ScoreRow[]; loading: boolean }` — fetches once and subscribes to live inserts, merging + re-ranking with `compareRank`.
  - `LeaderboardScreen({ signature, mode, isRemote, onBack }: { signature: string; mode: Mode; isRemote: boolean; onBack: () => void })`. Shows a "Local only" badge when `!isRemote`.

- [ ] **Step 1: Write the failing test**

`src/screens/LeaderboardScreen.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, test, expect } from 'vitest';
import { LeaderboardScreen } from './LeaderboardScreen';
import { getScoreStore } from '../storage';

beforeEach(() => localStorage.clear());

test('renders ranked rows for the signature and shows local-only badge', async () => {
  const store = getScoreStore();
  await store.submitScore({ signature: 'sig', display_name: 'Alice', score: 30, accuracy: 1, total_ms: 60000, mode: 'timed' });
  await store.submitScore({ signature: 'sig', display_name: 'Bob', score: 12, accuracy: 1, total_ms: 60000, mode: 'timed' });
  render(<LeaderboardScreen signature="sig" mode="timed" isRemote={false} onBack={() => {}} />);
  await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
  expect(screen.getByText(/local only/i)).toBeInTheDocument();
  const names = screen.getAllByTestId('lb-name').map((n) => n.textContent);
  expect(names).toEqual(['Alice', 'Bob']);
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/screens/LeaderboardScreen.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the hook and screen**

`src/hooks/useLeaderboard.ts`:

```ts
import { useEffect, useState } from 'react';
import { compareRank } from '../engine/scoring';
import { getScoreStore, type ScoreRow } from '../storage';
import type { Mode } from '../engine/types';

export function useLeaderboard(signature: string, mode: Mode) {
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const store = getScoreStore();
    let active = true;

    store
      .getLeaderboard(signature, mode)
      .then((data) => {
        if (active) {
          setRows(data);
          setLoading(false);
        }
      })
      .catch(() => active && setLoading(false));

    const unsub = store.subscribeLeaderboard(signature, mode, (row) => {
      setRows((prev) =>
        [...prev.filter((r) => r.id !== row.id), row].sort((a, b) => compareRank(mode, a, b)).slice(0, 50),
      );
    });

    return () => {
      active = false;
      unsub();
    };
  }, [signature, mode]);

  return { rows, loading };
}
```

`src/screens/LeaderboardScreen.tsx`:

```tsx
import { useLeaderboard } from '../hooks/useLeaderboard';
import type { Mode } from '../engine/types';

export function LeaderboardScreen({
  signature,
  mode,
  isRemote,
  onBack,
}: {
  signature: string;
  mode: Mode;
  isRemote: boolean;
  onBack: () => void;
}) {
  const { rows, loading } = useLeaderboard(signature, mode);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm font-semibold text-indigo-600">‹ Back</button>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Leaderboard</h2>
        {!isRemote && (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Local only</span>
        )}
        {isRemote && <span className="w-16" />}
      </header>

      <p className="text-center text-xs text-slate-400">{signature}</p>

      {loading ? (
        <p className="text-center text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-center text-slate-500">No scores yet — be the first!</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800">
              <span className="w-6 text-right font-bold text-slate-400">{i + 1}</span>
              <span data-testid="lb-name" className="flex-1 font-semibold text-slate-800 dark:text-slate-100">{r.display_name}</span>
              <span className="font-mono tabular-nums font-bold text-indigo-600">{r.score}</span>
              <span className="w-12 text-right text-xs text-slate-400">{Math.round(r.accuracy * 100)}%</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/screens/LeaderboardScreen.test.tsx`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useLeaderboard.ts src/screens/LeaderboardScreen.tsx src/screens/LeaderboardScreen.test.tsx
git commit -m "feat: live leaderboard hook + screen"
```

---

### Task 15: ResultsScreen (with submit + challenge share)

**Files:**
- Create: `src/screens/ResultsScreen.tsx`
- Test: `src/screens/ResultsScreen.test.tsx`

**Interfaces:**
- Consumes: `getScoreStore` (Task 8); `encodeChallenge` (Task 6); `Config`, `Result`, `Mode`.
- Produces: `ResultsScreen({ config, result, onSubmitted, onViewLeaderboard, onPlayAgain }: { config: Config; result: Result; onSubmitted: () => void; onViewLeaderboard: () => void; onPlayAgain: () => void })`. Shows stats; a name input + Submit that calls `store.submitScore(...)` then `onSubmitted()`; a "Copy challenge link" button that writes `location.origin + '#/play?c=' + encodeChallenge(config)` to the clipboard. Submit failures show an inline error and keep the screen.

- [ ] **Step 1: Write the failing test**

`src/screens/ResultsScreen.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, test, expect } from 'vitest';
import { ResultsScreen } from './ResultsScreen';
import { getScoreStore } from '../storage';
import { defaultConfig } from './ConfigScreen';
import type { Result } from '../engine/types';

beforeEach(() => localStorage.clear());

const result: Result = {
  signature: 'sig', mode: 'timed', correct: 15, attempts: 16,
  accuracy: 15 / 16, totalMs: 60000, avgMs: 3750, longestStreak: 9,
};

test('shows the score and submits with a display name', async () => {
  const onSubmitted = vi.fn();
  render(
    <ResultsScreen config={defaultConfig()} result={result}
      onSubmitted={onSubmitted} onViewLeaderboard={() => {}} onPlayAgain={() => {}} />,
  );
  expect(screen.getByText('15')).toBeInTheDocument();
  await userEvent.type(screen.getByPlaceholderText(/your name/i), 'Zed');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
  const board = await getScoreStore().getLeaderboard('sig', 'timed');
  expect(board[0].display_name).toBe('Zed');
});

test('submit is disabled until a name is entered', () => {
  render(
    <ResultsScreen config={defaultConfig()} result={result}
      onSubmitted={() => {}} onViewLeaderboard={() => {}} onPlayAgain={() => {}} />,
  );
  expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/screens/ResultsScreen.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the screen**

`src/screens/ResultsScreen.tsx`:

```tsx
import { useState } from 'react';
import { encodeChallenge } from '../engine/signature';
import { getScoreStore } from '../storage';
import type { Config, Result } from '../engine/types';

const NAME_KEY = 'hvmnd:name';

export function ResultsScreen({
  config,
  result,
  onSubmitted,
  onViewLeaderboard,
  onPlayAgain,
}: {
  config: Config;
  result: Result;
  onSubmitted: () => void;
  onViewLeaderboard: () => void;
  onPlayAgain: () => void;
}) {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    const display = name.trim().slice(0, 24);
    if (!display) return;
    setSubmitting(true);
    setError('');
    try {
      localStorage.setItem(NAME_KEY, display);
      await getScoreStore().submitScore({
        signature: result.signature,
        display_name: display,
        score: result.correct,
        accuracy: result.accuracy,
        total_ms: result.totalMs,
        mode: result.mode,
      });
      onSubmitted();
    } catch (e) {
      setError('Could not submit — your score is saved locally. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyChallenge = async () => {
    const link = `${location.origin}${location.pathname}#/play?c=${encodeChallenge(config)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copy failed — select and copy manually: ' + link);
    }
  };

  const secs = (result.totalMs / 1000).toFixed(1);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 p-4">
      <div className="text-center">
        <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">Score</div>
        <div className="text-7xl font-black text-indigo-600">{result.correct}</div>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Accuracy" value={`${Math.round(result.accuracy * 100)}%`} />
        <Stat label="Streak" value={String(result.longestStreak)} />
        <Stat label={result.mode === 'timed' ? 'Avg / q' : 'Time'} value={result.mode === 'timed' ? `${(result.avgMs / 1000).toFixed(1)}s` : `${secs}s`} />
      </dl>

      <div className="flex flex-col gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={24}
          className="h-12 rounded-xl border border-slate-300 px-4 text-lg dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <button type="button" disabled={!name.trim() || submitting} onClick={submit}
          className="h-12 rounded-xl bg-indigo-600 font-bold text-white disabled:opacity-40">
          {submitting ? 'Submitting…' : 'Submit to leaderboard'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copyChallenge}
          className="h-12 rounded-xl bg-slate-100 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {copied ? 'Copied!' : 'Copy challenge link'}
        </button>
        <button type="button" onClick={onViewLeaderboard}
          className="h-12 rounded-xl bg-slate-100 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Leaderboard
        </button>
      </div>

      <button type="button" onClick={onPlayAgain}
        className="h-14 rounded-2xl bg-indigo-600 text-lg font-bold text-white shadow-lg">
        Play again
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npx vitest run src/screens/ResultsScreen.test.tsx`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ResultsScreen.tsx src/screens/ResultsScreen.test.tsx
git commit -m "feat: results screen with submit + challenge share"
```

---

### Task 16: App shell (screen state machine + challenge-link entry)

**Files:**
- Modify: `src/App.tsx` (replace scaffold), `src/App.test.tsx` (replace smoke test)

**Interfaces:**
- Consumes: `ConfigScreen`+`defaultConfig` (Task 12), `TrialScreen` (Task 13), `ResultsScreen` (Task 15), `LeaderboardScreen` (Task 14), `usePreferences` (Task 9), `decodeChallenge`+`modeSignature` (Task 6), `isRemoteConfigured` (Task 8); `Config`, `Result`.
- Produces: full app flow `config → trial → results`, a leaderboard view reachable from results, and challenge-link boot: if the URL hash matches `#/play?c=<param>` and decodes, the app starts that exact trial immediately.

- [ ] **Step 1: Write the failing test**

Replace `src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, test, expect } from 'vitest';
import App from './App';

beforeEach(() => localStorage.clear());

test('shows config screen with a Start button by default', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
});

test('starting a trial hides the Start button and shows a problem', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /start/i }));
  expect(screen.queryByRole('button', { name: /^start$/i })).not.toBeInTheDocument();
  expect(screen.getByTestId('prompt')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL (old smoke test replaced; App still renders only a heading).

- [ ] **Step 3: Write the app shell**

Replace `src/App.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { ConfigScreen, defaultConfig } from './screens/ConfigScreen';
import { TrialScreen } from './screens/TrialScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { usePreferences } from './hooks/usePreferences';
import { decodeChallenge, modeSignature } from './engine/signature';
import { isRemoteConfigured } from './storage';
import type { Config, Result } from './engine/types';

type Screen = 'config' | 'trial' | 'results' | 'leaderboard';

function challengeFromHash(): Config | null {
  const m = window.location.hash.match(/#\/play\?c=([^&]+)/);
  return m ? decodeChallenge(decodeURIComponent(m[1])) : null;
}

export default function App() {
  const { prefs, setPrefs } = usePreferences();
  const [screen, setScreen] = useState<Screen>('config');
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const challenge = challengeFromHash();
    if (challenge) {
      setConfig(challenge);
      setScreen('trial');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const signature = useMemo(() => modeSignature(config), [config]);

  return (
    <div className="min-h-full bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {screen === 'config' && (
        <ConfigScreen
          initial={config}
          prefs={prefs}
          setPrefs={setPrefs}
          onStart={(c) => {
            setConfig(c);
            setScreen('trial');
          }}
        />
      )}

      {screen === 'trial' && (
        <TrialScreen
          config={config}
          prefs={prefs}
          onFinish={(r) => {
            setResult(r);
            setScreen('results');
          }}
        />
      )}

      {screen === 'results' && result && (
        <ResultsScreen
          config={config}
          result={result}
          onSubmitted={() => setScreen('leaderboard')}
          onViewLeaderboard={() => setScreen('leaderboard')}
          onPlayAgain={() => setScreen('config')}
        />
      )}

      {screen === 'leaderboard' && (
        <LeaderboardScreen
          signature={signature}
          mode={config.mode}
          isRemote={isRemoteConfigured}
          onBack={() => setScreen(result ? 'results' : 'config')}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run src/App.test.tsx`
Expected: all pass.

- [ ] **Step 5: Full suite + type check + build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all tests pass, no type errors, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: app shell with screen flow + challenge-link entry"
```

---

### Task 17: Backend schema, env docs, README

**Files:**
- Create: `supabase/schema.sql`, `.env.example`, `README.md`

**Interfaces:**
- Produces: the SQL to provision the leaderboard, an env template, and run/setup docs. No app-code tests; verification is a clean build + manual dev-server check.

- [ ] **Step 1: Write the Supabase schema**

`supabase/schema.sql`:

```sql
-- Run this in the Supabase SQL editor to provision the leaderboard.
create table if not exists public.scores (
  id           uuid primary key default gen_random_uuid(),
  signature    text not null,
  display_name text not null check (char_length(display_name) between 1 and 24),
  score        int  not null check (score >= 0),
  accuracy     real not null check (accuracy >= 0 and accuracy <= 1),
  total_ms     int  not null check (total_ms >= 0),
  mode         text not null check (mode in ('timed', 'fixed')),
  created_at   timestamptz not null default now()
);

create index if not exists scores_signature_idx on public.scores (signature);

alter table public.scores enable row level security;

create policy "anon can read scores"
  on public.scores for select
  using (true);

create policy "anon can insert scores"
  on public.scores for insert
  with check (
    char_length(display_name) between 1 and 24
    and score >= 0
    and accuracy >= 0 and accuracy <= 1
    and total_ms >= 0
    and mode in ('timed', 'fixed')
  );

-- Enable realtime for live leaderboard updates.
alter publication supabase_realtime add table public.scores;
```

- [ ] **Step 2: Write the env template**

`.env.example`:

```
# Copy to .env and fill in to enable the live global leaderboard.
# Leave unset to run with local-only (localStorage) scores.
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: Write the README**

`README.md`:

```markdown
# hvmnd — timed math trials

Fast, responsive mental-arithmetic drills (+ − × ÷) with customizable trials,
personal high scores, a live global leaderboard, and shareable challenge links.

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL. The app is fully playable immediately — scores are saved
locally in your browser until you connect a backend.

## Test

```bash
npm test          # run once
npm run test:watch
```

## Enable the live leaderboard (optional)

1. Create a free project at https://supabase.com.
2. In the SQL editor, run `supabase/schema.sql`.
3. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` from your project's API settings.
4. Restart `npm run dev`. Scores now sync to the global leaderboard in real time.

Without these vars the app uses local-only storage (an "Local only" badge shows
on the leaderboard).

## How it works

- **Modes:** Timed (solve as many as possible before the clock) or Fixed count
  (finish N problems as fast as you can).
- **Scoring:** wrong answers are counted and you move on. Timed ranks by correct
  answers (tie-break accuracy); Fixed ranks by correct answers (tie-break time).
- **Challenge links:** "Copy challenge link" on the results screen encodes the exact
  config + seed, so a friend plays the identical problem set for a fair comparison.

## Build

```bash
npm run build && npm run preview
```
```

- [ ] **Step 4: Verify build and dev server**

Run: `npm run build`
Expected: build succeeds.
Then run `npm run dev`, open the URL, play a short fixed-count trial, submit a score, and view the leaderboard (local-only badge visible). Stop the server.

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql .env.example README.md
git commit -m "docs: Supabase schema, env template, and README"
```

---

## Self-Review

**Spec coverage check (spec §→task):**
- §4 tech stack → Task 1.
- §5 game model / problem rules → Tasks 4, 10, 13.
- §6 scoring & ranking → Task 5 (+ used in 7, 8, 14).
- §7 customization (ops/difficulty/length/look&feel) → Tasks 9 (prefs), 12 (config).
- §8 mode signature + standard challenges → Task 6 (signature). *Note:* the "shipped standard challenge presets" surfaced prominently are a UI nicety on top of ConfigScreen; the signature machinery that makes them work is fully built. If desired as an explicit list, it is a small follow-up to ConfigScreen and does not change architecture.
- §9 comparison (leaderboard + challenge links) → Tasks 14 (leaderboard), 6 + 15 (challenge encode/share), 16 (challenge boot).
- §10 architecture (engine/storage/hooks/screens) → Tasks 2–16.
- §11 data model → Task 17.
- §12 seeded RNG + link codec → Tasks 3, 6.
- §13 responsiveness/accessibility → Tasks 11–13, 16 (Tailwind mobile-first, numpad, keyboard, theme, aria labels).
- §14 error handling → Task 8 (fallback), 12 (start gating), 15 (submit failure), 6+16 (bad link → null → config).
- §15 testing → tests in Tasks 3–16.
- §16 env/config → Task 17.

**Placeholder scan:** none — every code/test step contains full content.

**Type consistency:** `Config`, `Operation`, `Mode`, `Difficulty`, `Problem`, `Attempt`, `Result` from Task 2 used verbatim throughout. `ScoreRow`/`SubmitScoreInput`/`ScoreStore` from Task 7 reused in 8/14/15. `compareRank`, `summarize`, `createProblemGenerator`, `modeSignature`, `encodeChallenge`/`decodeChallenge`, `rangesForDifficulty`, `getScoreStore`, `usePreferences`, `useTimer`, `useGameEngine`, `useLeaderboard` names are consistent across producing and consuming tasks.

**Open note:** The one deliberately deferred spec item is the *prominent* rendering of standard preset challenges (§8) as a curated list on the config screen — the underlying signature bucketing they rely on is implemented, so this is additive UI only and safe to add after v1 without rework.
