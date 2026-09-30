/**
 * In-memory sliding-window rate limiter keyed by (user, action). Single-process only; good enough
 * for the MVP where one API process serves everything. Time comes from the injected Clock.
 */
import type { Clock } from "@fp/kernel";

export interface RateLimitRule {
  /** Max requests per window. */
  readonly limit: number;
  readonly windowMs: number;
}

export type RateLimitDecision = { readonly allowed: true } | { readonly allowed: false; readonly retryAfterMs: number };

export interface RateLimiter {
  /** Records the attempt when allowed. Rejected attempts are not recorded. */
  check(key: string, rule: RateLimitRule): RateLimitDecision;
}

/** Keys are dropped once their window is empty; a sweep runs when the table grows past `sweepAt`. */
export function createRateLimiter(clock: Clock, sweepAt = 10_000): RateLimiter {
  const hits = new Map<string, { windowMs: number; times: number[] }>();

  function prune(times: number[], now: number, windowMs: number): number[] {
    const cutoff = now - windowMs;
    let i = 0;
    while (i < times.length && (times[i] as number) <= cutoff) i++;
    return i === 0 ? times : times.slice(i);
  }

  function sweep(now: number): void {
    for (const [key, entry] of hits) {
      const kept = prune(entry.times, now, entry.windowMs);
      if (kept.length === 0) hits.delete(key);
      else entry.times = kept;
    }
  }

  return {
    check(key, rule) {
      const now = clock.now().getTime();
      if (hits.size >= sweepAt) sweep(now);
      const entry = hits.get(key) ?? { windowMs: rule.windowMs, times: [] };
      entry.windowMs = rule.windowMs;
      entry.times = prune(entry.times, now, rule.windowMs);
      if (entry.times.length >= rule.limit) {
        const oldest = entry.times[0] as number;
        hits.set(key, entry);
        return { allowed: false, retryAfterMs: Math.max(0, oldest + rule.windowMs - now) };
      }
      entry.times.push(now);
      hits.set(key, entry);
      return { allowed: true };
    },
  };
}
