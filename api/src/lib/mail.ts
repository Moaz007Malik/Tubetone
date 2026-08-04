import nodemailer from "nodemailer";

export type MailResult = { sent: boolean; skipped?: boolean; error?: string };

function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Public marketing site for email links (never localhost on production/Vercel). */
export function publicWebsiteUrl(): string {
  const raw = (process.env.PUBLIC_WEBSITE_URL || "").trim().replace(/\/+$/, "");
  const isLocal = !raw || /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(raw);
  const onProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  if (onProd) {
    if (raw && !isLocal) return raw;
    return "https://ytmp-website.vercel.app";
  }
  return raw || "http://127.0.0.1:3000";
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
  const site = publicWebsiteUrl();
  const downloadPage = `${site}/download`;
  const activatePage = `${site}/activate`;
  const accountPage = `${site}/account`;
  const installer = (process.env.DOWNLOAD_URL || "").trim();

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
    "Get started:",
    `1. Download YTMP: ${downloadPage}`,
    installer ? `   Installer: ${installer}` : "",
    "2. Open the app and paste this key to Activate",
    `3. Activation help: ${activatePage}`,
    `4. Account / status: ${accountPage}`,
    "",
    "If you did not request this, ignore this email.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Segoe UI,system-ui,sans-serif;line-height:1.5;color:#0f172a;max-width:520px">
      <h2 style="margin:0 0 12px;font-size:20px">Your YTMP license is ready</h2>
      <p style="margin:0 0 8px"><strong>Plan:</strong> ${escapeHtml(opts.plan)}</p>
      <p style="margin:0 0 8px"><strong>License key:</strong>
        <code style="font-size:15px;background:#f1f5f9;padding:2px 8px;border-radius:6px">${escapeHtml(opts.licenseKey)}</code>
      </p>
      ${
        opts.endsAt
          ? `<p style="margin:0 0 16px;color:#475569"><strong>Valid until:</strong> ${escapeHtml(new Date(opts.endsAt).toUTCString())}</p>`
          : ""
      }
      <ol style="margin:0 0 16px;padding-left:1.25rem">
        <li style="margin-bottom:8px"><a href="${downloadPage}">Download YTMP</a>${
          installer ? ` (<a href="${escapeHtml(installer)}">direct installer</a>)` : ""
        }</li>
        <li style="margin-bottom:8px">Open the app and paste your key to Activate</li>
        <li style="margin-bottom:8px"><a href="${activatePage}">Activation help</a></li>
        <li><a href="${accountPage}">Account / status</a></li>
      </ol>
      <p style="margin:0;color:#64748b;font-size:13px">If you did not request this, ignore this email.</p>
    </div>
  `.trim();

  return sendMail({
    to: opts.to,
    subject: "Your YTMP license key",
    text,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
