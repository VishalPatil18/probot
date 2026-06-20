import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const signInMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

import { RegisterForm } from "./RegisterForm";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  values: { username: string; email: string; password: string },
) {
  await user.type(screen.getByLabelText(/username/i), values.username);
  await user.type(screen.getByLabelText(/email/i), values.email);
  await user.type(screen.getByLabelText(/password/i), values.password);
  await user.click(screen.getByRole("button", { name: /create account/i }));
}

describe("RegisterForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    signInMock.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders username + email + password fields and a submit button", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeInTheDocument();
  });

  it("shows the check-your-email panel on 201 and does NOT auto-sign-in", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(201, {
        user: {
          id: "new-id",
          username: "jane-doe",
          email: "jane@example.com",
        },
        verificationEmailSent: true,
      }),
    );

    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillAndSubmit(user, {
      username: "jane-doe",
      email: "jane@example.com",
      password: "hunter2hunter",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "jane-doe",
          email: "jane@example.com",
          password: "hunter2hunter",
        }),
      }),
    );
    expect(
      await screen.findByRole("heading", { name: /check your email/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows the server message on 409 (duplicate)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, {
        error: "A user with this email already exists",
      }),
    );

    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillAndSubmit(user, {
      username: "jane-doe",
      email: "taken@example.com",
      password: "hunter2hunter",
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /already exists/i,
    );
    expect(signInMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("surfaces the first field error from a 400 validation payload", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        error: "Validation failed",
        details: {
          fieldErrors: {
            password: ["Password must be at least 8 characters"],
          },
          formErrors: [],
        },
      }),
    );

    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillAndSubmit(user, {
      username: "jane-doe",
      email: "jane@example.com",
      password: "short1", // intentionally invalid to drive the 400 mock
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /at least 8 characters/i,
    );
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("shows a network-error message when fetch rejects", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));

    const user = userEvent.setup();
    render(<RegisterForm />);

    await fillAndSubmit(user, {
      username: "jane-doe",
      email: "jane@example.com",
      password: "hunter2hunter",
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /network error/i,
    );
  });
});
