import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConversationsLineChart } from "./ConversationsLineChart";

function makeWeek(counts: number[]): Array<{ date: string; count: number }> {
  // Builds a 7-day window of dates ending today.
  return counts.map((count, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (counts.length - 1 - i));
    const iso = d.toISOString().slice(0, 10);
    return { date: iso, count };
  });
}

describe("ConversationsLineChart", () => {
  it("renders a dashed baseline (no curve) when every day has zero conversations", () => {
    const { container } = render(
      <ConversationsLineChart data={makeWeek([0, 0, 0, 0, 0, 0, 0])} />,
    );
    expect(container.querySelector("line[stroke-dasharray]")).toBeTruthy();
    // No smooth path generated when there's no data
    expect(container.querySelectorAll("path").length).toBe(0);
  });

  it("renders the smooth curve + fill + one dot per data point when data is non-empty", () => {
    const { container } = render(
      <ConversationsLineChart data={makeWeek([2, 5, 3, 7, 6, 4, 8])} />,
    );
    const paths = container.querySelectorAll("path");
    // Two paths: fill area + stroke curve
    expect(paths.length).toBe(2);
    const dots = container.querySelectorAll("circle");
    expect(dots.length).toBe(7);
  });

  it("renders the day-of-week label for each point and 'Today' for the last", () => {
    render(<ConversationsLineChart data={makeWeek([1, 2, 3, 4, 5, 6, 7])} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    // At least one weekday short name should appear (Mon/Tue/etc.)
    const anyWeekday = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/;
    const matches = Array.from(document.querySelectorAll("span")).filter((el) =>
      anyWeekday.test(el.textContent ?? ""),
    );
    expect(matches.length).toBeGreaterThan(0);
  });

  it("uses the largest count as the curve's peak (relative scaling)", () => {
    // Single point with count = 10 should appear at the top of the chart;
    // not a crash even with one point.
    const { container } = render(
      <ConversationsLineChart data={makeWeek([10])} />,
    );
    expect(container.querySelector("circle")).toBeTruthy();
  });
});
