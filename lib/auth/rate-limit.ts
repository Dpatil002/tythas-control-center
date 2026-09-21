import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { env } from '@/lib/env';
import { RateLimitError } from '@/lib/http/errors';

// In-memory fallback for local dev / tests when Upstash credentials are not set
class MemoryRateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async limit(identifier: string): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
    const now = Date.now();
    const timestamps = (this.hits.get(identifier) || []).filter((t) => now - t < this.windowMs);

    if (timestamps.length >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: now + this.windowMs,
      };
    }

    timestamps.push(now);
    this.hits.set(identifier, timestamps);

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - timestamps.length,
      reset: now + this.windowMs,
    };
  }
}

function createLimiter(requests: number, windowSeconds: number) {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
      analytics: false,
    });
  }

  return new MemoryRateLimiter(requests, windowSeconds * 1000);
}

export const loginLimiter = createLimiter(10, 60); // 10 attempts per minute
export const passwordResetLimiter = createLimiter(5, 300); // 5 attempts per 5 minutes
export const inviteAcceptLimiter = createLimiter(10, 60); // 10 attempts per minute

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || '127.0.0.1';
}

export async function checkRateLimit(
  limiter: { limit: (id: string) => Promise<{ success: boolean }> },
  identifier: string
) {
  const result = await limiter.limit(identifier);
  if (!result.success) {
    throw new RateLimitError();
  }
}
