import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatCard } from "./StatCard";

describe("StatCard", () => {
  it("renders the label and value", () => {
    render(<StatCard label="Total leads" value={42} />);
    expect(screen.getByText("Total leads")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders the optional hint when provided", () => {
    render(
      <StatCard label="Leads" value={7} hint="3 in the last 30 days" />,
    );
    expect(screen.getByText("3 in the last 30 days")).toBeInTheDocument();
  });

  it("does not render a hint paragraph when omitted", () => {
    render(<StatCard label="Bots" value={2} />);
    expect(screen.queryByText(/last 30 days/i)).not.toBeInTheDocument();
  });

  it("accepts a string value (not just a number)", () => {
    render(<StatCard label="Status" value="Active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
