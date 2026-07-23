import { Redis } from "@upstash/redis";

export interface RedisLike {
  eval<TArgs extends (string | number)[], TResult>(
    script: string,
    keys: string[],
    args: TArgs,
  ): Promise<TResult>;
  del(...keys: string[]): Promise<number>;
}

let cached: RedisLike | null | undefined;

export function getRedisClient(): RedisLike | null {
  if (cached !== undefined) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cached = null;
    return cached;
  }

  cached = new Redis({ url, token }) as unknown as RedisLike;
  return cached;
}

export function __setRedisClientForTests(client: RedisLike | null): void {
  cached = client;
}

export function __resetRedisClient(): void {
  cached = undefined;
}
