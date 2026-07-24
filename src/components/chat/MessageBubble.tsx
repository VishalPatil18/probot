import type { AnchorHTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { BotAvatarIcon } from "./BotAvatarIcon";
import type { ChatMessage } from "./types";

type BubbleMessage = Exclude<ChatMessage, { role: "system" }>;

type Props = {
  message: BubbleMessage;
  botImage?: string | null;
};

function SafeLink({
  href,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a {...rest} href={href} rel="noopener noreferrer" target="_blank">
      {children}
    </a>
  );
}

export function MessageBubble({ message, botImage }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          style={{ backgroundColor: "var(--bot-accent, #0070dd)" }}
          className="text-white rounded-2xl rounded-tr-md px-4 py-3 text-sm leading-relaxed max-w-[85%] shadow-soft whitespace-pre-wrap"
        >
          {message.text}
        </div>
      </div>
    );
  }

  if ("rateLimitMessage" in message) {
    return (
      <div className="flex gap-3">
        <BotAvatarIcon image={botImage} name="Assistant" sizeClass="size-8" />
        <div
          role="alert"
          className="bg-white border border-rose-200 rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed max-w-[85%] shadow-soft"
        >
          <p className="font-semibold text-rose-700">Please slow down.</p>
          <p className="text-muted mt-1">
            You&apos;re sending messages faster than your LLM provider allows.
            Wait a moment and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <BotAvatarIcon image={botImage} name="Assistant" sizeClass="size-8" />
      <div className="max-w-[85%]">
        <div className="bg-white border border-border-base rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed shadow-soft prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{ a: SafeLink }}
          >
            {message.text}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
