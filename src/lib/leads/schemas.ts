import { z } from "zod";

// Body for POST /api/bots/[botId]/leads. Called by the chat UI
// from any origin (CORS-public) so the contract is small and defensive.
//
// - `email` is the lead's email; trimmed + lowercased on parse so duplicate
//   detection (idempotent on conversationId + email) works case-insensitively.
// - `conversationId` is optional but strongly recommended - when present the
//   server pre-fills `conversations.recruiter_email` for the dashboard.
// - `contextSummary` is the truncated first 2-3 recruiter messages (built
//   client-side per Q5 in the design); capped at 1024 chars to bound row
//   size and prevent abuse.

export const LEAD_CONTEXT_SUMMARY_MAX = 1024;

export const leadCaptureInput = z.object({
  // Required contact details when a recruiter submits the form.
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  company: z.string().trim().min(1).max(160),
  // Optional LinkedIn profile URL (empty string is coerced to "absent").
  linkedinUrl: z.string().trim().url().max(255).optional().or(z.literal("")),
  conversationId: z.string().uuid().optional(),
  contextSummary: z.string().max(LEAD_CONTEXT_SUMMARY_MAX).optional(),
});

export type LeadCaptureInput = z.infer<typeof leadCaptureInput>;
