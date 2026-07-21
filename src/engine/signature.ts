import { OPERATIONS } from './types';
import type { Config, Operation } from './types';

function toBase64Url(s: string): string {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return decodeURIComponent(escape(atob(b64)));
}

function sortedOps(operations: Operation[]): Operation[] {
  return OPERATIONS.filter((op) => operations.includes(op));
}

export function modeSignature(config: Config): string {
  const ops = sortedOps(config.operations).join('');
  const length =
    config.mode === 'timed' ? `t${config.durationSec}` : `f${config.problemCount}`;
  let diff = config.difficulty as string;
  if (config.difficulty === 'custom') {
    const ranges = sortedOps(config.operations)
      .map((op) => `${op}:${config.ranges[op].min}-${config.ranges[op].max}`)
      .join(',');
    diff = `custom(${ranges})`;
  }
  const neg = config.allowNegatives ? 'neg' : 'pos';
  return `${ops}|${diff}|${length}|${neg}`;
}

const MAX_PARAM_LENGTH = 2000;

export function encodeChallenge(config: Config): string {
  return toBase64Url(JSON.stringify(config));
}

export function decodeChallenge(param: string): Config | null {
  if (!param || param.length > MAX_PARAM_LENGTH) return null;
  try {
    const json = fromBase64Url(param);
    const obj = JSON.parse(json) as Config;
    if (!Array.isArray(obj.operations) || obj.operations.length === 0) return null;
    if (obj.mode !== 'timed' && obj.mode !== 'fixed') return null;
    if (typeof obj.seed !== 'number' || !obj.ranges) return null;
    return obj;
  } catch {
    return null;
  }
}
