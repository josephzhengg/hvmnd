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
    // Apply the full tiebreak in the query so the DB returns the true top-N
    // (and getPersonalBest's limit=1 the true best) before truncation, not an
    // arbitrary set among tied scores. The client re-sort keeps ordering exact.
    let query = this.client
      .from(TABLE)
      .select('*')
      .eq('signature', signature)
      .eq('mode', mode)
      .order('score', { ascending: false });
    query =
      mode === 'timed'
        ? query.order('accuracy', { ascending: false }).order('total_ms', { ascending: true })
        : query.order('total_ms', { ascending: true });
    const { data, error } = await query.limit(limit);
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
