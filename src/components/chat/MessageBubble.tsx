import type { AnchorHTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ChatMessage } from "./types";

type Props = {
  message: ChatMessage;
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

export function MessageBubble({ message }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-brand text-white rounded-2xl rounded-tr-md px-4 py-3 text-sm leading-relaxed max-w-[85%] shadow-soft whitespace-pre-wrap">
          {message.text}
        </div>
      </div>
    );
  }

  if ("rateLimitMessage" in message) {
    return (
      <div className="flex gap-3">
        <BotAvatar />
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
      <BotAvatar />
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

function BotAvatar() {
  return (
    <div
      aria-hidden
      className="size-8 rounded-full brand-blue-gradient grid place-items-center text-white shrink-0 mt-0.5 text-xs font-bold"
    >
      AI
    </div>
  );
}
