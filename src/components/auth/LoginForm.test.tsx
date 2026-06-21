import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const signInMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    signInMock.mockReset();
  });

  it("renders email + password fields and a submit button", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("submits credentials and redirects to /dashboard on success", async () => {
    signInMock.mockResolvedValueOnce({ ok: true, error: null });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/password/i), "hunter2hunter");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "jane@example.com",
      password: "hunter2hunter",
      redirect: false,
    });
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows an error message and does not redirect on bad credentials", async () => {
    signInMock.mockResolvedValueOnce({ ok: false, error: "CredentialsSignin" });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid email or password/i,
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("renders working Google + GitHub + Magic Link buttons (no LinkedIn)", () => {
    render(<LoginForm />);
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: /github/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /magic link/i })).toBeEnabled();
    expect(screen.queryByText(/linkedin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/soon/i)).not.toBeInTheDocument();
  });

  it("Magic Link button shows hint when email field is empty", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.click(screen.getByRole("button", { name: /magic link/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /enter your email/i,
    );
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("Magic Link button calls signIn('email', ...) when email is valid", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.click(screen.getByRole("button", { name: /magic link/i }));
    expect(signInMock).toHaveBeenCalledWith("email", {
      email: "jane@example.com",
      callbackUrl: "/dashboard",
    });
  });
});
