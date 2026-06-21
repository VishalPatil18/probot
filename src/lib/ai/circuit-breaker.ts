// In-process circuit breaker for provider calls (NFR-S03).
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
// - `closed`: calls flow through. Consecutive failures get counted; a
//   success resets the failure count to zero.
// - `open`: every call rejects immediately with `circuit_open` without
//   touching the provider. Stays in `open` until `resetTimeoutMs` elapses.
// - `half-open`: the very next call after the cooldown is allowed through
//   as a probe. Success closes the circuit; failure re-opens it for
//   another full `resetTimeoutMs`. Concurrent calls during `half-open`
//   beyond the allowed probe count are rejected with `circuit_open`.
//
// Per-process state. Vercel/serverless cold starts naturally bound the
// memory and a fresh process resets the breaker; that's acceptable for
// a system whose primary upstream (LLM provider) recovers in minutes,
// not hours. Stage 8 may swap in Redis-backed state alongside the rate
// limiter if cross-instance behavior turns out to matter.

import { ProviderError } from "@/lib/ai/providers";

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxCalls: 1,
};

interface BreakerEntry {
  state: CircuitState;
  failures: number;
  openedAt: number; // ms epoch, valid only when state === "open" or "half-open"
  halfOpenInFlight: number;
}

const breakers = new Map<string, BreakerEntry>();

function getEntry(name: string): BreakerEntry {
  let entry = breakers.get(name);
  if (!entry) {
    entry = {
      state: "closed",
      failures: 0,
      openedAt: 0,
      halfOpenInFlight: 0,
    };
    breakers.set(name, entry);
  }
  return entry;
}

export function getCircuitState(name: string): CircuitState {
  return breakers.get(name)?.state ?? "closed";
}

// Force-reset for tests AND for an operator hotfix path (e.g. a known-bad
// breaker entry blocking a recovered provider). Not exported on the
// production surface today; tests import it directly.
export function __resetCircuit(name?: string): void {
  if (name) {
    breakers.delete(name);
  } else {
    breakers.clear();
  }
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
  options: CircuitBreakerOptions,
  now: number,
): void {
  entry.failures += 1;
  // A failure during half-open immediately re-opens the circuit.
  if (entry.state === "half-open") {
    openCircuit(entry, now);
    return;
  }
  if (entry.failures >= options.failureThreshold) {
    openCircuit(entry, now);
  }
}

function recordSuccess(entry: BreakerEntry): void {
  // Any success closes the circuit (including a successful half-open probe).
  closeCircuit(entry);
}

export async function callWithBreaker<T>(
  name: string,
  fn: () => Promise<T>,
  optionOverrides: Partial<CircuitBreakerOptions> = {},
): Promise<T> {
  const options = { ...DEFAULT_OPTIONS, ...optionOverrides };
  const entry = getEntry(name);
  const now = Date.now();

  if (entry.state === "open") {
    // Move into half-open ONCE the cooldown has elapsed. The transition
    // is lazy (no timer): we evaluate it on the next attempted call.
    if (now - entry.openedAt >= options.resetTimeoutMs) {
      entry.state = "half-open";
      entry.halfOpenInFlight = 0;
    } else {
      throw new ProviderError(
        name as never,
        "unknown",
        "circuit_open",
      );
    }
  }

  if (entry.state === "half-open") {
    if (entry.halfOpenInFlight >= options.halfOpenMaxCalls) {
      // Only N probe(s) allowed at a time. The rest fail-fast so the
      // probe gets to determine the new state cleanly.
      throw new ProviderError(
        name as never,
        "unknown",
        "circuit_open",
      );
    }
    entry.halfOpenInFlight += 1;
  }

  try {
    const result = await fn();
    recordSuccess(entry);
    return result;
  } catch (err) {
    recordFailure(entry, options, Date.now());
    if (entry.state === "half-open") {
      entry.halfOpenInFlight = Math.max(0, entry.halfOpenInFlight - 1);
    }
    throw err;
  }
}
