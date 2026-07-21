# Timed Math Trials — Design Spec

**Date:** 2026-07-20
**Status:** Approved design (pending user review of this doc)
**Working title:** hvmnd (rename TBD)

## 1. Overview

A responsive, mobile-first web app for timed mental-arithmetic trials across addition,
subtraction, multiplication, and division. Players fully customize each trial (which
operations, difficulty/number range, trial length, look & feel), get scored, keep
personal high scores, and compare against other people through a **live global
leaderboard** and **shareable seeded challenge links**.

Modeled on the well-known Zetamac mental-math trainer, with the deliberate variation
that a wrong answer is **counted and skipped** (the player moves on) rather than
forcing a retry — this adds an accuracy dimension to results.

## 2. Goals

- Fast, frictionless timed arithmetic drills that feel great on phone and desktop.
- Deep but simple customization of operations, difficulty, and trial length.
- Persistent personal high scores per challenge configuration.
- Real cross-device comparison: live global leaderboard + head-to-head challenge links.
- Runs immediately with a local fallback; upgrades to a real backend by adding creds.

## 3. Non-goals

- User accounts / passwords / OAuth. Players pick a display name only.
- Heavy anti-cheat. The leaderboard is trust-based with light DB constraints.
- Native mobile apps. This is a responsive web app.
- Server-side game logic. All gameplay runs client-side.

## 4. Tech stack

- **React + Vite + TypeScript** (SPA, no router library needed — simple screen state).
- **Tailwind CSS** for styling and responsive layout, with CSS custom properties as
  design tokens driving the dark/light themes.
- **Supabase** (Postgres + PostgREST + Realtime) as the backend for the global
  leaderboard, accessed via `@supabase/supabase-js` directly from the client.
- **Vitest + React Testing Library** for tests.

## 5. Game model & rules

- One problem shown at a time, large and centered.
- Player types the answer. On desktop, input auto-submits when the typed value
  matches the answer's digit count / on Enter; the app **auto-advances on a correct
  answer** for flow. On touch, an on-screen numpad is available.
- **Wrong answer:** marked incorrect, the player advances to the next problem
  (no forced retry, no skip button needed in ranked play).
- Two trial modes:
  - **Timed mode** — a countdown (30 / 60 / 120s). Solve as many as possible.
  - **Fixed-count mode** — a fixed number of problems (10 / 20 / 50). Finish as fast
    as possible.

### Problem generation rules

- **Addition:** operands drawn from the configured range.
- **Subtraction:** result stays ≥ 0 by construction, unless "allow negatives" is on.
- **Multiplication:** factors drawn from the configured range / times-table limit.
- **Division:** always whole-number results — generate `divisor` and `quotient` in
  range, present `divisor*quotient ÷ divisor`. Divisor is never 0.
- No identical consecutive problems; light shuffling of operation selection so a
  trial with multiple ops interleaves them.

## 6. Scoring

Tracked per attempt: correct count, total attempts, accuracy (`correct/attempts`),
average solve time, longest streak, and (fixed-count) total elapsed time.

**Leaderboard ranking metric per mode:**

- **Timed mode:** primary = correct answers; tie-break = accuracy, then avg solve time.
- **Fixed-count mode:** primary = correct answers (out of N); tie-break = total time (asc).

Personal bests are stored per **mode signature** (see §8).

## 7. Customization (config screen)

- **Operations:** independent toggles for + − × ÷ (at least one required to start).
- **Difficulty:** presets **Easy / Medium / Hard** that set number ranges and
  times-table limits, **plus** a custom mode with per-operation min/max inputs.
  - Easy: addends/minuends 1–10, tables to 10.
  - Medium: 1–20, tables to 12.
  - Hard: +/− operands 1–100, tables to 20.
  - Custom: user-set min/max per enabled operation; optional "allow negative results".
- **Trial length:** choose Timed (30/60/120s) or Fixed-count (10/20/50), with a
  custom value allowed in each.
- **Look & feel:** dark/light theme toggle, sound on/off, numpad on/off,
  keyboard-first behavior on desktop. Preferences persist in `localStorage`.

## 8. Mode signature & standard challenges

To make comparison meaningful, every result is tagged with a **mode signature**: a
canonical string derived from `{ operations set, difficulty tier or custom-range hash,
mode, duration/count, allowNegatives }`. Leaderboards are bucketed by this signature.

The app ships a small set of **standard preset challenges** (e.g. "60s · Mixed · Medium",
"20 problems · ×÷ · Hard") that are surfaced prominently so there is a shared,
competitive board everyone can climb. Custom configurations still produce a valid
signature and save personal bests locally; their global boards exist but may be sparse.

## 9. Comparing with other people

1. **Live global leaderboard** — top scores for the selected mode signature, updating
   in real time via a Supabase Realtime subscription. Filter/select by standard
   challenge or by the player's current custom signature. Shows rank, display name,
   score, accuracy, and date.
2. **Shareable challenge links** — a URL param encodes a **seed + full config**. Anyone
   opening the link plays the *identical* problem sequence (deterministic from the seed).
   The results screen shows a "Challenge a friend" share action and, when arriving via a
   challenge link, frames the run as head-to-head and lets both scores be compared.

## 10. Architecture

```
src/
  engine/            # pure TS, no React — unit tested
    rng.ts           # seeded PRNG (mulberry32 or similar), deterministic
    problems.ts      # problem generation from config + rng
    scoring.ts       # metrics + leaderboard ranking helpers
    signature.ts     # mode-signature canonicalization + challenge-link encode/decode
    types.ts         # shared domain types (Config, Problem, Attempt, Result, ...)
  storage/
    ScoreStore.ts    # interface: getPersonalBests, submitScore, subscribeLeaderboard
    LocalStore.ts    # localStorage implementation (default / offline fallback)
    SupabaseStore.ts # Supabase implementation (used when creds present)
    index.ts         # selects implementation based on env creds
  hooks/
    useTimer.ts
    useGameEngine.ts # drives problem flow, input handling, scoring
    useLeaderboard.ts
    usePreferences.ts
  screens/
    ConfigScreen.tsx
    TrialScreen.tsx
    ResultsScreen.tsx
    LeaderboardScreen.tsx
  components/
    Numpad.tsx
    TimerBar.tsx
    ProblemDisplay.tsx
    OperationToggle.tsx
    ... (small presentational pieces)
  App.tsx            # screen state machine (config → trial → results; leaderboard modal)
  main.tsx
```

- **Engine is framework-free** so it is fully unit-testable and reused for challenge
  links (same seed → same problems on every device).
- **Storage behind `ScoreStore` interface** with `LocalStore` and `SupabaseStore`
  implementations. `storage/index.ts` picks `SupabaseStore` when `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_ANON_KEY` are set, else `LocalStore`. An "offline / local only"
  badge is shown when running on the local fallback.

## 11. Data model (Supabase)

```sql
create table scores (
  id            uuid primary key default gen_random_uuid(),
  signature     text not null,          -- mode signature bucket
  display_name  text not null check (char_length(display_name) between 1 and 24),
  score         int  not null check (score >= 0),  -- primary metric (correct count)
  accuracy      real not null check (accuracy >= 0 and accuracy <= 1),
  total_ms      int  not null check (total_ms >= 0),
  mode          text not null,          -- 'timed' | 'fixed'
  created_at    timestamptz not null default now()
);

create index scores_signature_idx on scores (signature);
```

- **RLS:** enabled. Policy allows anonymous `select` on all rows and anonymous
  `insert` of rows that satisfy the check constraints. No update/delete for anon.
- **Realtime:** leaderboard screen subscribes to inserts filtered by `signature`.
- Ordering per mode handled in the query (timed: `score desc, accuracy desc`;
  fixed: `score desc, total_ms asc`).

## 12. Seeded RNG & challenge-link encoding

- Deterministic PRNG (e.g. mulberry32) seeded from a 32-bit integer.
- A challenge link is `#/play?c=<base64url(JSON{seed, config})>` (URL fragment so no
  server round-trip). Decoding reconstructs the exact config and seed; the engine then
  reproduces the identical problem stream. Malformed/oversized params fall back to the
  config screen with a friendly notice.

## 13. Responsiveness & accessibility

- **Mobile-first**, single-column, large tap targets; on-screen numpad reachable
  one-handed; the active problem and answer input never require scrolling during play.
- Scales to desktop: wider layout, keyboard-first input (digits, Backspace, Enter),
  no numpad needed.
- Respects `prefers-color-scheme` for initial theme; manual toggle overrides and
  persists. Sufficient contrast in both themes. Focus states visible.
- Sound effects (correct/incorrect/finish) gated behind the sound toggle; never
  block gameplay if audio fails.

## 14. Error handling

- **No operations selected / invalid custom range:** Start disabled with inline hint.
- **Supabase unreachable or unconfigured:** silently fall back to `LocalStore`; show
  the "local only" badge; score submission still records a local personal best.
- **Score submit fails:** keep the result on screen, show a retry affordance; local
  best is already saved regardless.
- **Bad challenge link:** notice + redirect to config, no crash.

## 15. Testing strategy

- **Engine unit tests (Vitest):**
  - Division always yields whole numbers; divisor never 0.
  - Subtraction non-negative unless allowNegatives; ranges respected per operation.
  - Seeded RNG reproducibility: same seed+config ⇒ identical problem sequence.
  - Scoring/ranking: correct ordering and tie-breaks for both modes.
  - Signature canonicalization is stable and order-independent for operation sets;
    challenge-link encode/decode round-trips.
- **Component tests (RTL):**
  - Config gating (can't start with zero operations).
  - Trial flow: correct answer advances & increments score; wrong answer counts as
    incorrect and advances.
  - Timer reaching zero ends a timed trial and routes to results.
- **Storage:** `LocalStore` tested against the `ScoreStore` interface;
  `SupabaseStore` covered by a thin mock of the client (no live network in tests).

## 16. Environment & configuration

- `.env.example` documents `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- A `supabase/schema.sql` file contains the table + RLS policies to paste into the
  Supabase SQL editor.
- README documents: `npm install`, `npm run dev`, `npm test`, and the (optional)
  Supabase setup steps. App is fully playable with local-only scores before setup.

## 17. Future / out of scope for v1

- Accounts and per-user history across devices.
- Per-operation live analytics (which facts are slow).
- Weekly/seasonal leaderboards; friend lists.
- More game modes (survival, escalating difficulty).
