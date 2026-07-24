import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Pagination } from "./Pagination";

const BASE = "/dashboard/bots/abc/conversations";

describe("Pagination", () => {
  it("renders nothing when total fits in a single page", () => {
    const { container } = render(
      <Pagination basePath={BASE} page={1} limit={20} total={15} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders prev disabled / next enabled on page 1 of many", () => {
    render(<Pagination basePath={BASE} page={1} limit={20} total={100} />);
    expect(screen.getByText("Page 1 of 5")).toBeInTheDocument();
    const next = screen.getByRole("link", { name: /next/i });
    expect(next.getAttribute("href")).toBe(`${BASE}?page=2`);
    expect(screen.queryByRole("link", { name: /prev/i })).toBeNull();
  });

  it("renders both prev and next on a middle page", () => {
    render(<Pagination basePath={BASE} page={3} limit={20} total={100} />);
    expect(screen.getByText("Page 3 of 5")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /prev/i }).getAttribute("href")).toBe(
      `${BASE}?page=2`,
    );
    expect(screen.getByRole("link", { name: /next/i }).getAttribute("href")).toBe(
      `${BASE}?page=4`,
    );
  });

  it("renders next disabled on the last page", () => {
    render(<Pagination basePath={BASE} page={5} limit={20} total={100} />);
    expect(screen.queryByRole("link", { name: /next/i })).toBeNull();
    expect(screen.getByRole("link", { name: /prev/i }).getAttribute("href")).toBe(
      `${BASE}?page=4`,
    );
  });

  it("preserves extra query params (e.g. ?q=) across page links", () => {
    render(
      <Pagination
        basePath={BASE}
        page={2}
        limit={20}
        total={100}
        extraParams={{ q: "python" }}
      />,
    );
    const prev = screen.getByRole("link", { name: /prev/i }).getAttribute("href");
    const next = screen.getByRole("link", { name: /next/i }).getAttribute("href");
    expect(prev).toBe(`${BASE}?q=python`);
    expect(next).toBe(`${BASE}?q=python&page=3`);
  });

  it("drops empty extra params", () => {
    render(
      <Pagination
        basePath={BASE}
        page={2}
        limit={20}
        total={100}
        extraParams={{ q: "", empty: undefined, real: "x" }}
      />,
    );
    const next = screen.getByRole("link", { name: /next/i }).getAttribute("href") ?? "";
    expect(next).not.toContain("q=");
    expect(next).not.toContain("empty=");
    expect(next).toContain("real=x");
  });
});
