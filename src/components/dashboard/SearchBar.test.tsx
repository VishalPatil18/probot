import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replaceMock = vi.fn();
let searchParamsState = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => searchParamsState,
}));

import { SearchBar } from "./SearchBar";

const BASE = "/dashboard/bots/abc/conversations";

describe("SearchBar", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    searchParamsState = new URLSearchParams();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("seeds the input from the initial ?q= URL param", () => {
    searchParamsState = new URLSearchParams("q=python");
    render(<SearchBar basePath={BASE} />);
    expect(screen.getByRole("searchbox")).toHaveValue("python");
  });

  it("calls router.replace after the debounce window with the new q", () => {
    render(<SearchBar basePath={BASE} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ml" } });
    vi.advanceTimersByTime(250);
    expect(replaceMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(replaceMock).toHaveBeenCalledWith(`${BASE}?q=ml`);
  });

  it("clears the q param when input is emptied", () => {
    searchParamsState = new URLSearchParams("q=python");
    render(<SearchBar basePath={BASE} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
    vi.advanceTimersByTime(400);
    expect(replaceMock).toHaveBeenCalledWith(BASE);
  });

  it("resets ?page= to 1 (drops it from the URL) when the search changes", () => {
    searchParamsState = new URLSearchParams("page=5");
    render(<SearchBar basePath={BASE} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "x" } });
    vi.advanceTimersByTime(400);
    const call = replaceMock.mock.calls[0]?.[0] as string;
    expect(call).not.toContain("page=");
    expect(call).toContain("q=x");
  });

  it("exposes the placeholder as aria-label for screen readers", () => {
    render(<SearchBar basePath={BASE} placeholder="Search by email…" />);
    const input = screen.getByRole("searchbox");
    expect(input.getAttribute("aria-label")).toBe("Search by email…");
  });
});
