import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="No conversations yet" />);
    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
  });

  it("renders the body when provided", () => {
    render(<EmptyState title="No leads" body="Share your bot URL to capture leads" />);
    expect(screen.getByText("Share your bot URL to capture leads")).toBeInTheDocument();
  });

  it("renders the optional action node", () => {
    render(
      <EmptyState
        title="Nothing here"
        action={<a href="/x">Take action</a>}
      />,
    );
    expect(screen.getByRole("link", { name: "Take action" })).toBeInTheDocument();
  });
});
