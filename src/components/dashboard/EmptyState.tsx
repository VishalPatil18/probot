import type { ReactNode } from "react";

type Props = {
  title: string;
  body?: string;
  action?: ReactNode;
};

export function EmptyState({ title, body, action }: Props) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border-base bg-white p-10 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {body ? <p className="mt-1 text-xs text-muted">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
