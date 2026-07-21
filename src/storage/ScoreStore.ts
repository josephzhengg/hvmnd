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
