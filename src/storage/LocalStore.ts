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
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as ScoreRow[]) : [];
    } catch {
      return [];
    }
  }

  private writeAll(rows: ScoreRow[]): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(rows));
    } catch {
      // Storage full or unavailable (e.g. Safari private mode); scores remain
      // in memory for this session rather than crashing the submit flow.
    }
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
