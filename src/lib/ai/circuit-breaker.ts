// Circuit breaker for provider calls (NFR-S03), backed by a pluggable store.
//
// State machine (per provider name):
//
//   closed ───[N consecutive failures]──> open
//     ▲                                     │
//     │                                     │ [resetTimeoutMs elapsed]
//     │                                     ▼
//     └────[half-open probe succeeds]──── half-open
//             [half-open probe fails]
//                       │
//                       ▼
//                     open
//
// - `closed`: calls flow through. Consecutive failures get counted; a success
//   resets the failure count to zero.
// - `open`: every call rejects immediately with `circuit_open` without touching
//   the provider. Stays in `open` until `resetTimeoutMs` elapses.
// - `half-open`: the very next call after the cooldown is allowed through as a
//   probe. Success closes the circuit; failure re-opens it. Concurrent calls
//   during `half-open` beyond the probe count are rejected with `circuit_open`.
//
// Storage:
//   - In-memory (default): per-process Map. Vercel/serverless cold starts bound
//     memory and a fresh process resets the breaker - acceptable for a single
//     instance whose upstream recovers in minutes.
//   - Upstash Redis (opt-in): the entry is a JSON blob with a TTL, so an outage
//     that trips one instance is seen by every other instance. The load/save
//     cycle is best-effort atomic - a rare interleaving may double-count a
//     failure, harmless for a fail-fast optimization (not a security control).
//     Trade-off: ~2 Redis round-trips per call when Redis is enabled.

import { ProviderError } from "@/lib/ai/providers";
import { getRedisClient, type RedisLike } from "@/lib/store/redis";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
  // Fired once when a failure transitions the circuit into `open`. Used to
  // raise an operational alert at the start of a provider outage.
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
  openedAt: number; // ms epoch, valid only when state === "open" or "half-open"
  halfOpenInFlight: number;
}

function freshEntry(): BreakerEntry {
  return { state: "closed", failures: 0, openedAt: 0, halfOpenInFlight: 0 };
}

// Backing store contract. `load` returns the current entry (or a fresh closed
// one); `save` persists it with a TTL so idle entries self-expire.
export interface BreakerStore {
  load(name: string): Promise<BreakerEntry>;
  save(name: string, entry: BreakerEntry, ttlMs: number): Promise<void>;
  reset(name?: string): Promise<void>;
}

// ---- In-memory store (default) -------------------------------------------

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

// ---- Redis store (opt-in) -------------------------------------------------

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
    // A nameless reset (clear-all) is a test-only affordance; in production we
    // don't scan and delete every breaker key.
    if (name) await this.redis.del(this.key(name));
  }
}

// ---- Store selection ------------------------------------------------------

const memoryStore = new MemoryBreakerStore();

function getStore(): BreakerStore {
  const redis = getRedisClient();
  return redis ? new RedisBreakerStore(redis) : memoryStore;
}

function ttlFor(options: { resetTimeoutMs: number }): number {
  // Keep an entry well past one reset cycle so a flapping provider's state
  // survives between calls, but let it self-expire once truly idle.
  return Math.max(options.resetTimeoutMs * 2, 60_000);
}

export async function getCircuitState(name: string): Promise<CircuitState> {
  const store = getStore();
  if (store === memoryStore) return memoryStore.peek(name);
  return (await store.load(name)).state;
}

// Force-reset for tests AND for an operator hotfix path (e.g. a known-bad
// breaker entry blocking a recovered provider).
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

// Mutates `entry`; returns true if this failure transitioned it into `open`.
function recordFailure(
  entry: BreakerEntry,
  options: { failureThreshold: number },
  now: number,
): boolean {
  const wasOpen = entry.state === "open";
  entry.failures += 1;
  // A failure during half-open immediately re-opens the circuit.
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
    // Move into half-open once the cooldown has elapsed. The transition is
    // lazy (no timer): it's evaluated on the next attempted call.
    if (now - entry.openedAt >= options.resetTimeoutMs) {
      entry.state = "half-open";
      entry.halfOpenInFlight = 0;
    } else {
      throw new ProviderError(name as never, "unknown", "circuit_open");
    }
  }

  if (entry.state === "half-open") {
    if (entry.halfOpenInFlight >= options.halfOpenMaxCalls) {
      // Only N probe(s) allowed at a time. The rest fail-fast so the probe
      // gets to determine the new state cleanly.
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
