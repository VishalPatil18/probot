import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricTile } from "./MetricTile";

describe("MetricTile", () => {
  it("renders label, value and an icon", () => {
    render(<MetricTile label="Total conversations" value={128} icon="forum" />);
    expect(screen.getByText("Total conversations")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
  });

  it("renders a faded growth pill when fadedGrowth is supplied", () => {
    render(
      <MetricTile
        label="Total messages"
        value={612}
        icon="chat"
        fadedGrowth="+24%"
      />,
    );
    const pill = screen.getByText("+24%");
    expect(pill).toBeInTheDocument();
    expect(pill.className).toContain("opacity");
  });

  it("renders a Coming Soon pill + fades the value when comingSoon=true", () => {
    render(
      <MetricTile
        label="Response time"
        value="1.4s"
        icon="bolt"
        comingSoon
      />,
    );
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
    const value = screen.getByText("1.4s");
    expect(value.className).toContain("opacity");
  });

  it("does NOT render a Coming Soon pill when comingSoon is omitted", () => {
    render(
      <MetricTile label="Leads" value={9} icon="contact_mail" fadedGrowth="+3 new" />,
    );
    expect(screen.queryByText(/coming soon/i)).toBeNull();
  });
});
