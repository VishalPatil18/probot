import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.mock("./Sidebar", () => ({
  SidebarIcon: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`} />
  ),
}));

import { SidebarNavLink } from "./SidebarNavLink";

describe("SidebarNavLink - active state via usePathname", () => {
  beforeEach(() => {
    pathname = "/dashboard";
  });

  it("marks the /dashboard row active on the exact home path", () => {
    pathname = "/dashboard";
    render(
      <SidebarNavLink href="/dashboard" icon="dashboard" label="Dashboard" />,
    );
    const link = screen.getByRole("link", { name: /dashboard/i });
    expect(link.className).toContain("text-brand");
    expect(link.className).toContain("bg-blue-50");
  });

  it("does NOT mark /dashboard active on a sub-path (exact match only)", () => {
    pathname = "/dashboard/bots/abc/conversations";
    render(
      <SidebarNavLink href="/dashboard" icon="dashboard" label="Dashboard" />,
    );
    const link = screen.getByRole("link", { name: /dashboard/i });
    expect(link.className).not.toContain("text-brand");
  });

  it("marks the Conversations row active on a transcript path (prefix match)", () => {
    pathname = "/dashboard/bots/abc/conversations/xyz";
    render(
      <SidebarNavLink
        href="/dashboard/bots/abc/conversations"
        icon="forum"
        label="Conversations"
      />,
    );
    const link = screen.getByRole("link", { name: /conversations/i });
    expect(link.className).toContain("text-brand");
  });

  it("renders the right badge with brand tone when supplied", () => {
    pathname = "/dashboard";
    render(
      <SidebarNavLink
        href="/dashboard/bots/abc/leads"
        icon="contact_mail"
        label="Leads"
        rightBadge="9"
        badgeTone="brand"
      />,
    );
    const badge = screen.getByText("9");
    expect(badge.className).toContain("bg-brand");
  });

  it("renders the right badge with muted tone (default)", () => {
    pathname = "/dashboard";
    render(
      <SidebarNavLink
        href="/dashboard/bots/abc/conversations"
        icon="forum"
        label="Conversations"
        rightBadge="128"
      />,
    );
    const badge = screen.getByText("128");
    expect(badge.className).toContain("bg-neutral-100");
  });

  it("opens external links in a new tab with rel=noopener noreferrer", () => {
    pathname = "/dashboard";
    render(
      <SidebarNavLink
        href="https://pro-bot.dev/docs/embed-share"
        icon="code"
        label="Embed & share"
        external
      />,
    );
    const link = screen.getByRole("link", { name: /embed & share/i });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("never marks external links active even when pathname matches the href shape", () => {
    pathname = "https://pro-bot.dev/docs/embed-share";
    render(
      <SidebarNavLink
        href="https://pro-bot.dev/docs/embed-share"
        icon="code"
        label="Embed & share"
        external
      />,
    );
    const link = screen.getByRole("link", { name: /embed & share/i });
    expect(link.className).not.toContain("text-brand");
  });
});
