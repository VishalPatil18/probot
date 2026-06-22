import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

import { AvatarUploader } from "./AvatarUploader";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AvatarUploader", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the fallback when there is no image", () => {
    render(
      <AvatarUploader
        initialImage={null}
        uploadUrl="/api/bots/abc/avatar"
        fallback={<span>FB</span>}
      />,
    );
    expect(screen.getByText("FB")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /change photo/i }),
    ).toBeInTheDocument();
  });

  it("uploads the chosen file to the given URL and refreshes", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { image: "/api/bots/abc/avatar?v=1" }),
    );
    const user = userEvent.setup();
    const { container } = render(
      <AvatarUploader
        initialImage={null}
        uploadUrl="/api/bots/abc/avatar"
        fallback={<span>FB</span>}
      />,
    );

    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File([new Uint8Array([0x89, 0x50])], "pic.png", {
      type: "image/png",
    });
    await user.upload(input, file);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bots/abc/avatar",
      expect.objectContaining({ method: "POST" }),
    );
    expect(refreshMock).toHaveBeenCalled();
  });
});
