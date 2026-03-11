export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

export interface RateLimitInput {
  key: string;
  limit: number;
  windowSeconds: number;
}
