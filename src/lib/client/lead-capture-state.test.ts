// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  readLeadCaptureState,
  writeLeadCaptureState,
} from "./lead-capture-state";

const BOT = "11111111-1111-1111-1111-111111111111";
const SES_A = "22222222-2222-2222-2222-22222222222a";
const SES_B = "22222222-2222-2222-2222-22222222222b";

describe("lead-capture-state", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("returns 'pending' when nothing has been written", () => {
    expect(readLeadCaptureState(BOT, SES_A)).toBe("pending");
  });

  it("round-trips each status value", () => {
    writeLeadCaptureState(BOT, SES_A, "shown");
    expect(readLeadCaptureState(BOT, SES_A)).toBe("shown");
    writeLeadCaptureState(BOT, SES_A, "captured");
    expect(readLeadCaptureState(BOT, SES_A)).toBe("captured");
    writeLeadCaptureState(BOT, SES_A, "dismissed");
    expect(readLeadCaptureState(BOT, SES_A)).toBe("dismissed");
  });

  it("isolates state across (botId, sessionId) pairs", () => {
    writeLeadCaptureState(BOT, SES_A, "captured");
    expect(readLeadCaptureState(BOT, SES_B)).toBe("pending");
  });

  it("returns 'pending' on a garbage stored value", () => {
    window.sessionStorage.setItem(
      `probot.lead.v1:${BOT}:${SES_A}`,
      "nonsense",
    );
    expect(readLeadCaptureState(BOT, SES_A)).toBe("pending");
  });

  it("survives a sessionStorage read failure", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("quota");
    };
    try {
      expect(readLeadCaptureState(BOT, SES_A)).toBe("pending");
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});
