import { GoogleGenerativeAI } from "@google/generative-ai";

import type { SendMessage } from "../types";

// Server-side helper for Google Gemini. Consumers call this in their own
// API route to build a `SendMessage` backed by Gemini. Same shape as
// `createOpenAIHandler` / `createAnthropicHandler` for symmetry.
//
// This helper must NOT run in the browser: it holds the API key.

export interface GoogleHandlerOptions {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export function createGoogleHandler(opts: GoogleHandlerOptions): SendMessage {
  return async ({ system, messages }) => {
    const client = new GoogleGenerativeAI(opts.apiKey);
    const model = client.getGenerativeModel({
      model: opts.model,
      // Gemini's "system" instruction lives at model-config level, not in
      // the messages array. That's why the Anthropic / OpenAI adapters take
      // it as a top-level param — the `SendMessage` interface stays
      // provider-agnostic; the plumbing differs per SDK.
      systemInstruction: system,
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.7,
      },
    });

    // Gemini's chat.history uses "user" / "model" (not "assistant") roles.
    // Split off the last message; that's what we're sending. Everything
    // prior is the conversation history.
    const last = messages[messages.length - 1];
    if (!last) return "";
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const chat = model.startChat({ history });
    const res = await chat.sendMessage(last.content);
    return res.response.text() ?? "";
  };
}
