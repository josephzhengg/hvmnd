import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimer(durationSec: number, running: boolean) {
  const [remainingMs, setRemainingMs] = useState(durationSec * 1000);
  const endRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    const full = durationSec * 1000;
    endRef.current = Date.now() + full;
    setRemainingMs(full);
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
