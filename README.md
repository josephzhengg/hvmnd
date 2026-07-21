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
