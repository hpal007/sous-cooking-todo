import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  checkRateLimit,
  __resetRateLimit,
  RATE_LIMIT_MAX,
} from "../lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    __resetRateLimit();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to MAX_HITS requests in a window", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect(checkRateLimit("1.2.3.4").allowed).toBe(true);
    }
  });

  it("blocks the request past the limit and reports a Retry-After", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit("1.2.3.4");
    const blocked = checkRateLimit("1.2.3.4");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks different clients independently", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit("1.1.1.1");
    expect(checkRateLimit("1.1.1.1").allowed).toBe(false);
    expect(checkRateLimit("2.2.2.2").allowed).toBe(true);
  });

  it("resets after the window elapses", () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit("9.9.9.9");
    expect(checkRateLimit("9.9.9.9").allowed).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(checkRateLimit("9.9.9.9").allowed).toBe(true);
  });
});
