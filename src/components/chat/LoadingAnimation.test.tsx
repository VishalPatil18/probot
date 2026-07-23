import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoadingAnimation } from "./LoadingAnimation";

const messages = ["Thinking…", "Searching memory…", "Drafting a response…"];

describe("LoadingAnimation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the first loading message on mount", () => {
    render(<LoadingAnimation messages={messages} />);
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
  });

  it("renders an accessible status region for screen readers", () => {
    render(<LoadingAnimation messages={messages} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("cycles to the next message after 3 seconds", () => {
    render(<LoadingAnimation messages={messages} />);
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText("Searching memory…")).toBeInTheDocument();
  });

  it("wraps around to the first message after the last", () => {
    render(<LoadingAnimation messages={messages} />);
    act(() => {
      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(3000);
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText("Thinking…")).toBeInTheDocument();
  });

  it("falls back to a default message when messages list is empty", () => {
    render(<LoadingAnimation messages={[]} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("cleans up its interval on unmount (no leaks)", () => {
    const { unmount } = render(<LoadingAnimation messages={messages} />);
    unmount();
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(10_000);
      });
    }).not.toThrow();
  });
});
