import { GoogleGenerativeAI } from "@google/generative-ai";

import type { SendMessage } from "../types";

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
      systemInstruction: system,
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.7,
      },
    });

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
