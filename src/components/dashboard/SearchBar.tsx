"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

type Props = {
  basePath: string;
  placeholder?: string;
  paramName?: string;
};

const DEBOUNCE_MS = 300;

// Stage 6 §6.4: debounced search input for the conversations list. Pushes
// the value to the URL via `router.replace` (so the back button doesn't
// fill with every keystroke) and wraps the update in `useTransition` so
// the input stays responsive while the server-rendered list re-fetches.
//
// Resets `?page=` to 1 implicitly by not including it in the new URL -
// otherwise a search after navigating to page 5 would land on page 5 of
// the filtered results, which is almost always empty.
export function SearchBar({
  basePath,
  placeholder = "Search…",
  paramName = "q",
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state from URL when the param changes externally (server-driven
  // navigation, browser back/forward). Without this the input could display
  // a stale value while the rendered list reflects the new param.
  useEffect(() => {
    const next = searchParams.get(paramName) ?? "";
    setValue((prev) => (prev === next ? prev : next));
  }, [searchParams, paramName]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  function commit(next: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next.trim().length === 0) {
      params.delete(paramName);
    } else {
      params.set(paramName, next);
    }
    // Reset to first page on every search change
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs.length > 0 ? `${basePath}?${qs}` : basePath);
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commit(next), DEBOUNCE_MS);
  }

  return (
    <input
      type="search"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full rounded-xl border border-border-base bg-white px-4 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
    />
  );
}
