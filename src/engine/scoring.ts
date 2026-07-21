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
