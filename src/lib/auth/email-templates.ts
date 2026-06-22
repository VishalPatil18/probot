// Email body builders. Kept separate from `email.ts` (the Resend transport)
// so that template tweaks don't pull the Resend client into test bundles and
// so that a future email vendor swap only touches `email.ts`.

interface TemplateLink {
  url: string;
}

interface Template {
  subject: string;
  html: string;
  text: string;
}

export function magicLinkEmail({ url }: TemplateLink): Template {
  return {
    subject: "Sign in to ProBot",
    html: shell({
      title: "Sign in to ProBot",
      body: `Click the button below to sign in. This link expires in 24 hours.`,
      ctaLabel: "Sign in to ProBot",
      ctaUrl: url,
      footer: "If you didn't request this email, you can safely ignore it.",
    }),
    text: `Sign in to ProBot

Click the link below to sign in. This link expires in 24 hours.

${url}

If you didn't request this email, you can safely ignore it.`,
  };
}

export function emailVerificationEmail({ url }: TemplateLink): Template {
  return {
    subject: "Verify your ProBot email",
    html: shell({
      title: "Verify your email",
      body: `Confirm this is the right inbox for your ProBot account. The link expires in 24 hours.`,
      ctaLabel: "Verify email",
      ctaUrl: url,
      footer:
        "If you didn't sign up for ProBot, you can safely ignore this email - no account was created on your behalf.",
    }),
    text: `Verify your ProBot email

Click the link below to verify this is the right inbox. This link expires in 24 hours.

${url}

If you didn't sign up for ProBot, you can safely ignore this email.`,
  };
}

interface LeadCapturedArgs {
  botName: string;
  leadEmail: string;
  dashboardUrl: string;
}

export function leadCapturedEmail({
  botName,
  leadEmail,
  dashboardUrl,
}: LeadCapturedArgs): Template {
  return {
    subject: `New lead from ${botName}`,
    html: shell({
      title: "You captured a new lead",
      body: `${leadEmail} left their email after chatting with ${botName}. Open your dashboard to see the conversation and follow up.`,
      ctaLabel: "View leads",
      ctaUrl: dashboardUrl,
      footer:
        "You're receiving this because you enabled lead emails. Turn it off anytime from the notification bell in your dashboard.",
    }),
    text: `New lead from ${botName}

${leadEmail} left their email after chatting with ${botName}.

View your leads: ${dashboardUrl}

You're receiving this because you enabled lead emails. Turn it off anytime from the notification bell in your dashboard.`,
  };
}

interface DeletionInitiatedArgs extends TemplateLink {
  scheduledPurgeAt: Date;
}

export function deletionInitiatedEmail({
  url,
  scheduledPurgeAt,
}: DeletionInitiatedArgs): Template {
  const dateLine = scheduledPurgeAt.toUTCString();
  return {
    subject: "Your ProBot account is scheduled for deletion",
    html: shell({
      title: "Account deletion scheduled",
      body: `We received a request to delete your ProBot account. Your data will be permanently deleted on ${dateLine}. You have 7 days to undo this if you change your mind - just click the button below.`,
      ctaLabel: "Undo deletion",
      ctaUrl: url,
      footer:
        "If you didn't request this deletion, click the Undo button above immediately and rotate your password from the login page.",
    }),
    text: `Account deletion scheduled

We received a request to delete your ProBot account. Your data will be permanently deleted on ${dateLine}. You have 7 days to undo this if you change your mind - open the link below to cancel.

${url}

If you didn't request this deletion, open the link above to cancel and rotate your password from the login page.`,
  };
}

interface DeletionCompleteArgs {
  username: string;
}

export function deletionCompleteEmail({
  username,
}: DeletionCompleteArgs): Template {
  return {
    subject: "Your ProBot account has been deleted",
    html: `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 40px auto; padding: 24px; color: #18181b;">
    <h1 style="font-size: 22px; margin: 0 0 16px;">Your ProBot account is gone</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 24px;">
      We've permanently deleted the account associated with <strong>${escapeHtmlInline(username)}</strong>. Your bots, conversations, leads, and uploaded knowledge are gone from our systems.
    </p>
    <p style="font-size: 12px; color: #71717a; margin: 0;">
      If you didn't request this deletion and you're seeing this message in error, please contact us immediately - we cannot recover the data, but we can investigate how the deletion was triggered.
    </p>
  </body>
</html>`,
    text: `Your ProBot account is gone

We've permanently deleted the account associated with ${username}. Your bots, conversations, leads, and uploaded knowledge are gone from our systems.

If you didn't request this deletion and you're seeing this message in error, please contact us immediately - we cannot recover the data, but we can investigate how the deletion was triggered.`,
  };
}

function escapeHtmlInline(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function passwordResetEmail({ url }: TemplateLink): Template {
  return {
    subject: "Reset your ProBot password",
    html: shell({
      title: "Reset your password",
      body: `We received a request to reset your ProBot password. The link below expires in 1 hour and can be used once.`,
      ctaLabel: "Choose a new password",
      ctaUrl: url,
      footer:
        "If you didn't request a password reset, you can safely ignore this email - your password will not change.",
    }),
    text: `Reset your ProBot password

We received a request to reset your ProBot password. The link below expires in 1 hour and can be used once.

${url}

If you didn't request a password reset, you can safely ignore this email - your password will not change.`,
  };
}

interface ShellOptions {
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  footer: string;
}

function shell({
  title,
  body,
  ctaLabel,
  ctaUrl,
  footer,
}: ShellOptions): string {
  const safeUrl = escapeHtml(ctaUrl);
  return `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 40px auto; padding: 24px; color: #18181b;">
    <h1 style="font-size: 22px; margin: 0 0 16px;">${escapeHtml(title)}</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 24px;">
      ${escapeHtml(body)}
    </p>
    <p style="margin: 0 0 24px;">
      <a href="${safeUrl}"
         style="display: inline-block; background: #2563eb; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        ${escapeHtml(ctaLabel)}
      </a>
    </p>
    <p style="font-size: 12px; color: #71717a; margin: 0;">
      ${escapeHtml(footer)}
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
