import "server-only";

const store = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export function rateLimit(key: string, config: RateLimitConfig): {
  success: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { success: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}
