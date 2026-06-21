"use client";

import { useEffect, useState } from "react";

// Returns a copy of `value` that only updates after `delayMs` of no changes.
// Used to throttle the signup availability check so we hit the API on a pause,
// not on every keystroke.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
