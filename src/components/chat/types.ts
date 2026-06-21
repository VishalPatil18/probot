// Discriminated union for chat messages.
//
// `id` is a per-insertion synthetic identifier so React can reconcile this
// list correctly through retries, replacements, and (later) optimistic edits.
// Never use the array index - Task 1.8 will introduce error-retry that mutates
// items in place.
//
// The `rateLimitMessage` sentinel is a server-error signal that the chat UI
// renders as a special "slow down" card instead of a markdown bubble. It
// carries no user-visible text - the renderer supplies the copy.
//
// Stage 6 §6.2: `lead_capture` is the in-chat lead-capture card injected by
// ChatWindow after the 3rd assistant reply. It is rendered inline in the
// message list so the visual flow stays coherent (card sits between
// bubbles, reuses the scroll-to-bottom behavior). The variant carries no
// content of its own - the card component owns its UI + state.
export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string }
  | { id: string; role: "assistant"; rateLimitMessage: true }
  | { id: string; role: "system"; kind: "lead_capture" };
