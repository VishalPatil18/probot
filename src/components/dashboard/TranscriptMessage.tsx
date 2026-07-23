import type { AnchorHTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  role: string;
  content: string;
  createdAt: Date;
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

function formatTime(d: Date): string {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TranscriptMessage({ role, content, createdAt }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%]">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-soft ${
            isUser
              ? "rounded-tr-md bg-brand text-white whitespace-pre-wrap"
              : "rounded-tl-md border border-border-base bg-white prose prose-sm max-w-none"
          }`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{ a: SafeLink }}
          >
            {content}
          </ReactMarkdown>
        </div>
        <p
          className={`mt-1 text-xs text-muted ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {formatTime(createdAt)}
        </p>
      </div>
    </div>
  );
}
