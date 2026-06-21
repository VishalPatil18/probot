import { Resend } from "resend";

import {
  deletionCompleteEmail,
  deletionInitiatedEmail,
  emailVerificationEmail,
  magicLinkEmail,
  passwordResetEmail,
} from "./email-templates";

interface SendLinkArgs {
  to: string;
  url: string;
}

async function sendTemplated(
  args: SendLinkArgs & { template: ReturnType<typeof magicLinkEmail> },
): Promise<void> {
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
    to: args.to,
    subject: args.template.subject,
    html: args.template.html,
    text: args.template.text,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}

export async function sendMagicLinkEmail(args: SendLinkArgs): Promise<void> {
  await sendTemplated({ ...args, template: magicLinkEmail({ url: args.url }) });
}

export async function sendEmailVerificationEmail(
  args: SendLinkArgs,
): Promise<void> {
  await sendTemplated({
    ...args,
    template: emailVerificationEmail({ url: args.url }),
  });
}

export async function sendPasswordResetEmail(
  args: SendLinkArgs,
): Promise<void> {
  await sendTemplated({
    ...args,
    template: passwordResetEmail({ url: args.url }),
  });
}

interface SendDeletionInitiatedArgs extends SendLinkArgs {
  scheduledPurgeAt: Date;
}

export async function sendDeletionInitiatedEmail(
  args: SendDeletionInitiatedArgs,
): Promise<void> {
  await sendTemplated({
    to: args.to,
    url: args.url,
    template: deletionInitiatedEmail({
      url: args.url,
      scheduledPurgeAt: args.scheduledPurgeAt,
    }),
  });
}

interface SendDeletionCompleteArgs {
  to: string;
  username: string;
}

export async function sendDeletionCompleteEmail(
  args: SendDeletionCompleteArgs,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    // Best-effort: if Resend isn't configured we don't crash the purge.
    return;
  }
  const template = deletionCompleteEmail({ username: args.username });
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: args.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}
