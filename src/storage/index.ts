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
