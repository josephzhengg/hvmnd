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
