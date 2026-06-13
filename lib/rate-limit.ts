// Lightweight in-memory sliding-window rate limiter.
//
// This is a best-effort guard for a public, unauthenticated endpoint that spends
// money on every call. It bounds abuse from a single client within one server
// instance. It is intentionally simple — on a multi-instance/serverless deploy
// each instance keeps its own counter, so for production-grade limits you'd move
// this to a shared store (e.g. Upstash Redis). Good enough to stop a tab-hammer.

type Hit = { count: number; resetAt: number };

const WINDOW_MS = 60_000; // 1 minute
const MAX_HITS = 12; // per IP per window
const buckets = new Map<string, Hit>();

export function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const hit = buckets.get(key);

  if (!hit || now > hit.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  hit.count += 1;
  if (hit.count > MAX_HITS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((hit.resetAt - now) / 1000),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

// Opportunistic cleanup so the map can't grow unbounded over a long-lived process.
export function sweepRateLimit(): void {
  const now = Date.now();
  for (const [key, hit] of buckets) {
    if (now > hit.resetAt) buckets.delete(key);
  }
}

// Test seam: clear all buckets so unit tests don't leak state into each other.
export function __resetRateLimit(): void {
  buckets.clear();
}

export const RATE_LIMIT_MAX = MAX_HITS;
