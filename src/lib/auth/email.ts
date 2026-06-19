import { Resend } from "resend";

interface MagicLinkEmail {
  to: string;
  url: string;
}

// NextAuth's EmailProvider hands us the verification URL; we forward it via
// Resend's HTTP API. Resend free tier: 100 emails/day, 3,000/month.
export async function sendMagicLinkEmail({
  to,
  url,
}: MagicLinkEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  if (!from) {
    throw new Error("EMAIL_FROM is not configured");
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Sign in to ProBot",
    html: buildHtml(url),
    text: buildText(url),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}

function buildText(url: string): string {
  return `Sign in to ProBot

Click the link below to sign in. This link expires in 24 hours.

${url}

If you didn't request this email, you can safely ignore it.`;
}

function buildHtml(url: string): string {
  const safeUrl = escapeHtml(url);
  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 40px auto; padding: 24px; color: #18181b;">
    <h1 style="font-size: 22px; margin: 0 0 16px;">Sign in to ProBot</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 24px;">
      Click the button below to sign in. This link expires in 24 hours.
    </p>
    <p style="margin: 0 0 24px;">
      <a href="${safeUrl}"
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Sign in to ProBot
      </a>
    </p>
    <p style="font-size: 12px; color: #71717a; margin: 0;">
      If you didn't request this email, you can safely ignore it.
    </p>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
