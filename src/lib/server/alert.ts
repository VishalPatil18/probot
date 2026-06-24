import { redactSensitive } from "@/lib/server/redact";

// Operational alerting seam. Emits a structured event for failure modes an
// operator needs to know about (today: a provider circuit opening). The
// default sink is a redacted `console.warn` so it shows up in Vercel/host logs
// with zero dependencies; a future Sentry transport drops in by calling
// `setAlertSink` once at startup - no call site changes.

export type AlertLevel = "warn" | "error";

export interface OperationalAlert {
  event: string;
  level: AlertLevel;
  detail?: Record<string, unknown>;
}

export type AlertSink = (alert: OperationalAlert) => void;

let sink: AlertSink | null = null;

// Install a custom transport (e.g. Sentry). Pass null to restore the default.
export function setAlertSink(custom: AlertSink | null): void {
  sink = custom;
}

function defaultSink(alert: OperationalAlert): void {
  // redactSensitive strips anything key-shaped before it reaches the log.
  const payload = redactSensitive(alert.detail ?? {});
  console.warn(`[alert] ${alert.event}`, payload);
}

export function emitOperationalAlert(alert: OperationalAlert): void {
  (sink ?? defaultSink)(alert);
}

// Fired at the start of a provider outage, when the breaker transitions to open.
export function alertCircuitOpen(provider: string): void {
  emitOperationalAlert({
    event: "circuit_open",
    level: "error",
    detail: { provider },
  });
}
