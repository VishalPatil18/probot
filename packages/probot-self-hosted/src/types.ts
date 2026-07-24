export type Personality = "professional" | "creative" | "enthusiastic";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type SendMessage = (input: {
  system: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}) => Promise<string>;

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
  context?: string;
  contextChunks?: string[];
  customInstructions?: string;
  sendMessage: SendMessage;
  dashboard?: DashboardLink;
  captureLead?: boolean;
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
