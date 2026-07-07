// Public types for the self-hosted ProBot package. Everything a consumer
// needs to configure `<ProbotBot />` or the vanilla mount() call lives here.

export type Personality = "professional" | "creative" | "enthusiastic";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Function the consumer must provide. Called on every visitor turn with the
// system prompt + full transcript. The consumer implements this against their
// own backend (recommended) or a same-origin proxy - the LLM key never lives
// in the browser bundle.
export type SendMessage = (input: {
  system: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}) => Promise<string>;

// Optional platform link: set this and the widget POSTs each completed turn
// (and any captured lead) to the ProBot dashboard for analytics. Config edits
// on pro-bot.dev are intentionally disabled for self-hosted bots - the
// dashboard is view-only for this deployment mode.
export interface DashboardLink {
  token: string;
  apiUrl?: string;
}

export interface ProbotBotConfig {
  name: string;
  headline?: string;
  personality?: Personality;
  themeColor?: string;
  avatarUrl?: string;
  suggestedQuestions?: string[];
  loadingMessages?: string[];
  // Knowledge for the system prompt. Either a single string or pre-chunked;
  // both get joined with "\n\n---\n\n" when the prompt is built.
  context?: string;
  contextChunks?: string[];
  customInstructions?: string;
  sendMessage: SendMessage;
  dashboard?: DashboardLink;
  captureLead?: boolean;
  // Called when the visitor submits their email in the lead form. Return
  // false to keep the form open with an error state.
  onLead?: (lead: { email: string; conversationId?: string }) => void | Promise<void>;
}

export interface UseProbotChatReturn {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  send: (text?: string) => Promise<void>;
  busy: boolean;
  error: string | null;
  sessionId: string;
}
