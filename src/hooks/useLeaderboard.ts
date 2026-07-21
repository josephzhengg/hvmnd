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
