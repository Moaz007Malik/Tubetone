import nodemailer from "nodemailer";

export type MailResult = { sent: boolean; skipped?: boolean; error?: string };

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Critical on Vercel: bad/slow SMTP must not hang the request forever
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
  });
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<MailResult> {
  if (!smtpConfigured()) {
    console.warn("[mail] SMTP not configured — skipping email to", opts.to);
    return { sent: false, skipped: true };
  }
  try {
    const from =
      process.env.SMTP_FROM ||
      process.env.SUPPORT_EMAIL ||
      process.env.SMTP_USER ||
      "noreply@ytmp.app";
    await transporter().sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html || opts.text.replace(/\n/g, "<br/>"),
    });
    return { sent: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "send failed";
    console.error("[mail]", error);
    return { sent: false, error };
  }
}

export async function sendLicenseEmail(opts: {
  to: string;
  licenseKey: string;
  plan: string;
  endsAt?: Date | string | null;
}): Promise<MailResult> {
  const site = (process.env.PUBLIC_WEBSITE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
  const ends =
    opts.endsAt == null
      ? ""
      : `\nValid until: ${new Date(opts.endsAt).toUTCString()}`;
  const text = [
    "Your YTMP license is ready.",
    "",
    `Plan: ${opts.plan}`,
    `License key: ${opts.licenseKey}`,
    ends.trim(),
    "",
    "1. Install YTMP from the Download page",
    "2. Open the app and paste this key to Activate",
    "",
    `Activate help: ${site}/activate`,
    `Account status: ${site}/account`,
    "",
    "If you did not request this, ignore this email.",
  ]
    .filter(Boolean)
    .join("\n");

  return sendMail({
    to: opts.to,
    subject: "Your YTMP license key",
    text,
  });
}
