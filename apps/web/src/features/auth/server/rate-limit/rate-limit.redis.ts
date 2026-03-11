import type { Redis } from "ioredis";

import type { RateLimitInput, RateLimitResult } from "./rate-limit.types";

export class RedisRateLimiter {
  constructor(private readonly redis: Redis) {}

  async check(input: RateLimitInput): Promise<RateLimitResult> {
    const ttlSeconds = input.windowSeconds;
    const key = `auth:ratelimit:${input.key}`;

    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, ttlSeconds);
    }

    const ttl = await this.redis.ttl(key);

    if (current > input.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, ttl),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, input.limit - current),
      retryAfterSeconds: ttl > 0 ? ttl : undefined,
    };
  }
}
