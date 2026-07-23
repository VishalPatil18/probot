export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string }
  | { id: string; role: "assistant"; rateLimitMessage: true }
  | { id: string; role: "system"; kind: "lead_capture" };
