/**
 * Rate Limiter for Chat Agent
 * Prevents abuse and ensures fair resource usage
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed
   * @param identifier - User ID, IP, or session ID
   * @returns {allowed: boolean, remaining: number, resetTime: number}
   */
  check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // Check if blocked
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }

    // Initialize or reset if window expired
    if (!entry || entry.resetTime < now) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
      this.store.set(identifier, newEntry);
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > this.config.maxRequests) {
      entry.blockedUntil = now + this.config.blockDurationMs;
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil(this.config.blockDurationMs / 1000),
      };
    }

    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (
        entry.resetTime < now &&
        (!entry.blockedUntil || entry.blockedUntil < now)
      ) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for an identifier (useful for testing/admin)
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }
}

// Production rate limits:
// - 30 requests per minute per user
// - 100 requests per 5 minutes per user
// - Block for 1 minute if exceeded

export const chatRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
  blockDurationMs: 60 * 1000, // 1 minute block
});

export const burstRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 5 * 60 * 1000, // 5 minutes
  blockDurationMs: 5 * 60 * 1000, // 5 minute block
});
