import type { AnchorHTMLAttributes } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  role: string;
  content: string;
  createdAt: Date;
};

// Mirror of the SafeLink rule in the live chat MessageBubble: every
// rendered <a> is opened in a new tab with the noopener+noreferrer pair so
// a malicious link in stored transcript text can't reach back into the
// dashboard via window.opener.
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

// Stage 6 §6.4: read-only message bubble for the dashboard transcript
// viewer. Renders user turns right-aligned in brand color, assistant
// turns left-aligned in white. Both go through react-markdown so the
// transcript matches what the recruiter saw at the time.
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
