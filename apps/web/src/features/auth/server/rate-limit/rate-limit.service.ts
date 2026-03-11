import Redis from "ioredis";

import type { RateLimitInput, RateLimitResult } from "./rate-limit.types";
import { RedisRateLimiter } from "./rate-limit.redis";

let redisClient: Redis | null = null;
let limiter: RedisRateLimiter | null = null;

function allowWithoutLimit(limit: number): RateLimitResult {
  return {
    allowed: true,
    remaining: limit,
  };
}

function getRedisClient(): Redis {
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is required for rate limiting.");
  }

  redisClient = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  return redisClient;
}

function getLimiter(): RedisRateLimiter {
  if (limiter) return limiter;
  limiter = new RedisRateLimiter(getRedisClient());
  return limiter;
}

export async function checkAuthRateLimit(
  key: string,
  options?: {
    limit?: number;
    windowSeconds?: number;
  },
): Promise<RateLimitResult> {
  const limit = options?.limit ?? 5;
  const windowSeconds = options?.windowSeconds ?? 300;

  if (!process.env.REDIS_URL) {
    // Keep auth available in environments without Redis.
    return allowWithoutLimit(limit);
  }

  try {
    const client = getRedisClient();
    if (client.status === "wait") {
      await client.connect();
    }

    return await getLimiter().check({
      key,
      limit,
      windowSeconds,
    });
  } catch {
    // Fail open to avoid turning transient Redis issues into auth outages.
    return allowWithoutLimit(limit);
  }
}
