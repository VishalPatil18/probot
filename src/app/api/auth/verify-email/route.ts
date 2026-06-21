import { NextResponse } from "next/server";

import { verifyAndConsumeToken } from "@/lib/auth/email-verification";
import { verifyEmailInput } from "@/lib/auth/schemas";

// GET handler so the email link works without client JS. The browser is
// redirected to /login with a status flag the LoginForm picks up.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const parsed = verifyEmailInput.safeParse({ token });
  if (!parsed.success) {
    return NextResponse.redirect(
      new URL("/login?verify=invalid", request.url),
    );
  }

  const result = await verifyAndConsumeToken(parsed.data.token);
  if (!result.ok) {
    const code = result.reason === "expired" ? "expired" : "invalid";
    return NextResponse.redirect(new URL(`/login?verify=${code}`, request.url));
  }

  return NextResponse.redirect(new URL("/login?verify=ok", request.url));
}
