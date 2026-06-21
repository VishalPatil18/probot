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
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("submits credentials (remembered by default) and redirects on success", async () => {
    signInMock.mockResolvedValueOnce({ ok: true, error: null });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2hunter");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "jane@example.com",
      password: "hunter2hunter",
      remember: "true",
      redirect: false,
    });
    expect(pushMock).toHaveBeenCalledWith("/dashboard");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("passes remember=false when 'Keep me signed in' is unchecked", async () => {
    signInMock.mockResolvedValueOnce({ ok: true, error: null });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2hunter");
    await user.click(screen.getByLabelText(/keep me signed in/i));
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(signInMock).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ remember: "false" }),
    );
  });

  it("toggles password visibility via the show/hide button", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const field = screen.getByLabelText("Password");
    expect(field).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(field).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: /hide password/i }));
    expect(field).toHaveAttribute("type", "password");
  });

  it("opens the forgot-password modal from the Forgot link", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /forgot\?/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows an error message and does not redirect on bad credentials", async () => {
    signInMock.mockResolvedValueOnce({ ok: false, error: "CredentialsSignin" });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
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
