import { redactSensitive } from "@/lib/server/redact";

export type AlertLevel = "warn" | "error";

export interface OperationalAlert {
  event: string;
  level: AlertLevel;
  detail?: Record<string, unknown>;
}

export type AlertSink = (alert: OperationalAlert) => void;

let sink: AlertSink | null = null;

export function setAlertSink(custom: AlertSink | null): void {
  sink = custom;
}

function defaultSink(alert: OperationalAlert): void {
  const payload = redactSensitive(alert.detail ?? {});
  console.warn(`[alert] ${alert.event}`, payload);
}

export function emitOperationalAlert(alert: OperationalAlert): void {
  (sink ?? defaultSink)(alert);
}

export function alertCircuitOpen(provider: string): void {
  emitOperationalAlert({
    event: "circuit_open",
    level: "error",
    detail: { provider },
  });
}
