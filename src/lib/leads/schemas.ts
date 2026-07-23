import { z } from "zod";

export const LEAD_CONTEXT_SUMMARY_MAX = 1024;

export const leadCaptureInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  company: z.string().trim().min(1).max(160),
  linkedinUrl: z.string().trim().url().max(255).optional().or(z.literal("")),
  conversationId: z.string().uuid().optional(),
  contextSummary: z.string().max(LEAD_CONTEXT_SUMMARY_MAX).optional(),
});

export type LeadCaptureInput = z.infer<typeof leadCaptureInput>;
