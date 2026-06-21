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

const AVAILABILITY_OK = {
  username: { available: true },
  email: { available: true },
};

// The form fires a debounced availability check AND the register POST through
// the same global fetch. Route by URL: availability returns "all clear" unless
// a test overrides it; the register call uses the supplied responder.
function routeFetch(registerResponder: () => Promise<Response>) {
  fetchMock.mockImplementation((url: string) => {
    if (String(url).includes("check-availability")) {
      return Promise.resolve(jsonResponse(200, AVAILABILITY_OK));
    }
    return registerResponder();
  });
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  values: { username: string; email: string; password: string },
) {
  await user.type(screen.getByLabelText(/username/i), values.username);
  await user.type(screen.getByLabelText(/email/i), values.email);
  await user.type(screen.getByLabelText("Password"), values.password);
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
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeInTheDocument();
  });

  it("shows the check-your-email panel on 201 and does NOT auto-sign-in", async () => {
    routeFetch(() =>
      Promise.resolve(
        jsonResponse(201, {
          user: {
            id: "new-id",
            username: "jane-doe",
            email: "jane@example.com",
          },
          verificationEmailSent: true,
        }),
      ),
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
    routeFetch(() =>
      Promise.resolve(
        jsonResponse(409, {
          error: "A user with this email already exists",
        }),
      ),
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
    routeFetch(() =>
      Promise.resolve(
        jsonResponse(400, {
          error: "Validation failed",
          details: {
            fieldErrors: {
              password: ["Password must be at least 8 characters"],
            },
            formErrors: [],
          },
        }),
      ),
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
    routeFetch(() => Promise.reject(new Error("offline")));

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

  it("flags a taken username inline and disables submit", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (String(url).includes("check-availability")) {
        return Promise.resolve(
          jsonResponse(200, {
            username: { available: false, reason: "This username is taken" },
            email: { available: true },
          }),
        );
      }
      return Promise.resolve(jsonResponse(201, {}));
    });

    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/username/i), "takenname");

    expect(
      await screen.findByText(
        /this username is taken/i,
        {},
        { timeout: 2000 },
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeDisabled();
  });
});
