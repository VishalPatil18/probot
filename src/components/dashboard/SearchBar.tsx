"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

type Props = {
  basePath: string;
  placeholder?: string;
  paramName?: string;
};

const DEBOUNCE_MS = 300;

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
