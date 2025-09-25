const buckets = new Map<string, { count: number; expiresAt: number }>();

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfter: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.expiresAt - now) / 1000);
    return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
  }

  entry.count += 1;
  return { allowed: true, remaining: Math.max(limit - entry.count, 0) };
}
