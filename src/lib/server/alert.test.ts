import { afterEach, describe, expect, it, vi } from "vitest";

import {
  alertCircuitOpen,
  emitOperationalAlert,
  setAlertSink,
} from "./alert";

afterEach(() => {
  setAlertSink(null);
  vi.restoreAllMocks();
});

describe("operational alerts", () => {
  it("routes events to a custom sink when one is installed", () => {
    const sink = vi.fn();
    setAlertSink(sink);

    alertCircuitOpen("anthropic");

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith({
      event: "circuit_open",
      level: "error",
      detail: { provider: "anthropic" },
    });
  });

  it("falls back to a redacted console.warn by default", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    emitOperationalAlert({
      event: "test_event",
      level: "warn",
      detail: { apiKey: "sk-secret", provider: "openai" },
    });

    expect(warn).toHaveBeenCalledTimes(1);
    const [, payload] = warn.mock.calls[0]!;
    expect(payload).toMatchObject({ apiKey: "[REDACTED]", provider: "openai" });
  });
});
