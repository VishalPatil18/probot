export { ProbotBot } from "./ProbotBot";
export { useProbotChat } from "./hooks/useProbotChat";
export { buildSystemPrompt } from "./prompt";
export { createOpenAIHandler } from "./adapters/openai";
export { reportConversation, reportLead } from "./adapters/dashboard";
export type {
  ChatMessage,
  DashboardLink,
  Personality,
  ProbotBotConfig,
  SendMessage,
  UseProbotChatReturn,
} from "./types";
