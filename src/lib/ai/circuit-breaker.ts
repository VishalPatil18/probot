import { ProviderError } from "@/lib/ai/providers";
import { getRedisClient, type RedisLike } from "@/lib/store/redis";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
  onOpen?: (name: string) => void;
}

const DEFAULT_OPTIONS: Required<Omit<CircuitBreakerOptions, "onOpen">> = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxCalls: 1,
};

export interface BreakerEntry {
  state: CircuitState;
  failures: number;
  openedAt: number;
  halfOpenInFlight: number;
}

function freshEntry(): BreakerEntry {
  return { state: "closed", failures: 0, openedAt: 0, halfOpenInFlight: 0 };
}

export interface BreakerStore {
  load(name: string): Promise<BreakerEntry>;
  save(name: string, entry: BreakerEntry, ttlMs: number): Promise<void>;
  reset(name?: string): Promise<void>;
}

class MemoryBreakerStore implements BreakerStore {
  private readonly entries = new Map<string, BreakerEntry>();

  async load(name: string): Promise<BreakerEntry> {
    let entry = this.entries.get(name);
    if (!entry) {
      entry = freshEntry();
      this.entries.set(name, entry);
    }
    return entry;
  }

  async save(name: string, entry: BreakerEntry): Promise<void> {
    this.entries.set(name, entry);
  }

  async reset(name?: string): Promise<void> {
    if (name) this.entries.delete(name);
    else this.entries.clear();
  }

  peek(name: string): CircuitState {
    return this.entries.get(name)?.state ?? "closed";
  }
}

class RedisBreakerStore implements BreakerStore {
  constructor(private readonly redis: RedisLike) {}

  private key(name: string): string {
    return `cb:${name}`;
  }

  async load(name: string): Promise<BreakerEntry> {
    const raw = await this.redis.eval<[], string | null>(
      `return redis.call('GET', KEYS[1])`,
      [this.key(name)],
      [],
    );
    if (!raw) return freshEntry();
    try {
      return JSON.parse(raw) as BreakerEntry;
    } catch {
      return freshEntry();
    }
  }

  async save(name: string, entry: BreakerEntry, ttlMs: number): Promise<void> {
    await this.redis.eval(
      `redis.call('SET', KEYS[1], ARGV[1], 'PX', ARGV[2]) return 1`,
      [this.key(name)],
      [JSON.stringify(entry), ttlMs],
    );
  }

  async reset(name?: string): Promise<void> {
    if (name) await this.redis.del(this.key(name));
  }
}

const memoryStore = new MemoryBreakerStore();

function getStore(): BreakerStore {
  const redis = getRedisClient();
  return redis ? new RedisBreakerStore(redis) : memoryStore;
}

function ttlFor(options: { resetTimeoutMs: number }): number {
  return Math.max(options.resetTimeoutMs * 2, 60_000);
}

export async function getCircuitState(name: string): Promise<CircuitState> {
  const store = getStore();
  if (store === memoryStore) return memoryStore.peek(name);
  return (await store.load(name)).state;
}

export async function __resetCircuit(name?: string): Promise<void> {
  await getStore().reset(name);
}

function openCircuit(entry: BreakerEntry, now: number): void {
  entry.state = "open";
  entry.openedAt = now;
  entry.halfOpenInFlight = 0;
}

function closeCircuit(entry: BreakerEntry): void {
  entry.state = "closed";
  entry.failures = 0;
  entry.openedAt = 0;
  entry.halfOpenInFlight = 0;
}

function recordFailure(
  entry: BreakerEntry,
  options: { failureThreshold: number },
  now: number,
): boolean {
  const wasOpen = entry.state === "open";
  entry.failures += 1;
  if (entry.state === "half-open") {
    openCircuit(entry, now);
    return !wasOpen;
  }
  if (entry.failures >= options.failureThreshold) {
    openCircuit(entry, now);
    return !wasOpen;
  }
  return false;
}

export async function callWithBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  optionOverrides: Partial<CircuitBreakerOptions> = {},
): Promise<T> {
  const options = { ...DEFAULT_OPTIONS, ...optionOverrides };
  const store = getStore();
  const entry = await store.load(name);
  const ttl = ttlFor(options);
  const now = Date.now();

  if (entry.state === "open") {
    if (now - entry.openedAt >= options.resetTimeoutMs) {
      entry.state = "half-open";
      entry.halfOpenInFlight = 0;
    } else {
      throw new ProviderError(name as never, "unknown", "circuit_open");
    }
  }

  if (entry.state === "half-open") {
    if (entry.halfOpenInFlight >= options.halfOpenMaxCalls) {
      throw new ProviderError(name as never, "unknown", "circuit_open");
    }
    entry.halfOpenInFlight += 1;
    await store.save(name, entry, ttl);
  }

  try {
    const result = await fn();
    closeCircuit(entry);
    await store.save(name, entry, ttl);
    return result;
  } catch (err) {
    const opened = recordFailure(entry, options, Date.now());
    if (entry.state === "half-open") {
      entry.halfOpenInFlight = Math.max(0, entry.halfOpenInFlight - 1);
    }
    await store.save(name, entry, ttl);
    if (opened) options.onOpen?.(name);
    throw err;
  }
}
