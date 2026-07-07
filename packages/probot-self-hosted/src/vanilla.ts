import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

import { ProbotBot } from "./ProbotBot";
import type { ProbotBotConfig } from "./types";

// Vanilla entrypoint for the <script src="probot-self-hosted.iife.js"> path.
// Exposes `window.ProbotSelfHosted.mount(target, config)` so a plain HTML
// page can drop the widget in without React or a bundler.

export function mount(target: string | HTMLElement, config: ProbotBotConfig): Root {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) throw new Error(`probot-self-hosted: target not found: ${String(target)}`);
  const root = createRoot(el);
  root.render(createElement(ProbotBot, config));
  return root;
}

export { ProbotBot };
export type { ProbotBotConfig };
