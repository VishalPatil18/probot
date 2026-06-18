// Extends Vitest's `expect` with @testing-library/jest-dom matchers
// (toBeInTheDocument, toHaveTextContent, toBeDisabled, etc.). Auto-loaded
// by vitest.config.ts setupFiles.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Tear down React renders between tests so getByRole doesn't see duplicates
// from prior tests in the same file.
afterEach(() => {
  cleanup();
});
