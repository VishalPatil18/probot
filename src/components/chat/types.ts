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
export type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string }
  | { id: string; role: "assistant"; rateLimitMessage: true };
