"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type MobileSidebarCtx = {
  open: boolean;
  setOpen: (next: boolean) => void;
};

const Ctx = createContext<MobileSidebarCtx | null>(null);

function useMobileSidebar(): MobileSidebarCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "MobileSidebar components must be used inside <MobileSidebarProvider>",
    );
  }
  return ctx;
}

// Mobile sidebar = hamburger button (placed inline in
// the Topbar) + slide-in panel (mounted at the layout root). State is
// shared via context so the trigger and panel coordinate without prop
// drilling through every server component in between.
export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close on path change - clicking a nav link inside the panel
  // navigates the user; the panel should not stay open over the new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}

// Hamburger button - visible only below lg breakpoint. Lives inside the
// Topbar so its position reads naturally as "top-left page chrome."
export function MobileSidebarToggle() {
  const { setOpen } = useMobileSidebar();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open navigation menu"
      className="grid size-9 shrink-0 place-items-center rounded-lg border border-border-base bg-white hover:bg-neutral-50 lg:hidden"
    >
      <svg
        aria-hidden
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  );
}

// Slide-in panel. Renders nothing on lg+ (the static <Sidebar> already
// covers desktop). On mobile, the panel slides in from the left over a
// scrim backdrop. ESC + backdrop click close it.
export function MobileSidebarPanel({ children }: { children: ReactNode }) {
  const { open, setOpen } = useMobileSidebar();

  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    // Prevent body scroll while the panel is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 lg:hidden"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={close}
        aria-hidden
      />
      <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border-base bg-white shadow-xl">
        <div className="flex h-12 items-center justify-end border-b border-border-base px-2">
          <button
            type="button"
            onClick={close}
            aria-label="Close navigation menu"
            className="grid size-9 place-items-center rounded-lg hover:bg-neutral-50"
          >
            <svg
              aria-hidden
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="thin-scroll flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}
