"use server";

import nodemailer from "nodemailer";
import { Resend } from "resend";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

type ResendConfig = {
  apiKey: string;
  from: string;
  replyTo?: string;
};

function getResendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const from =
    process.env.RESEND_FROM?.trim() ??
    process.env.SMTP_FROM?.trim() ??
    "onboarding@resend.dev";
  const replyTo = process.env.RESEND_REPLY_TO?.trim();

  return { apiKey, from, replyTo };
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host) {
    return null;
  }

  if ((user && !pass) || (!user && pass)) {
    throw new Error(
      "SMTP credentials are incomplete. Provide both SMTP_USER and SMTP_PASS, or neither."
    );
  }

  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "true";
  const from = process.env.SMTP_FROM ?? user ?? "no-reply@ayra.local";

  return { host, port, secure, user, pass, from };
}

async function sendViaResend(config: ResendConfig, payload: EmailPayload) {
  const client = new Resend(config.apiKey);
  const { error } = await client.emails.send({
    from: config.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    ...(config.replyTo ? { replyTo: config.replyTo } : {}),
  });

  if (error) {
    throw new Error(error.message || "Failed to send email via Resend.");
  }
}

async function sendViaSmtp(config: SmtpConfig, payload: EmailPayload) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.user && config.pass
      ? {
          auth: {
            user: config.user,
            pass: config.pass,
          },
        }
      : {}),
  });

  await transporter.sendMail({
    from: config.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
}

export async function sendEmail(payload: EmailPayload) {
  const resendConfig = getResendConfig();
  if (resendConfig) {
    await sendViaResend(resendConfig, payload);
    return;
  }

  const smtpConfig = getSmtpConfig();
  if (!smtpConfig) {
    throw new Error(
      "Email delivery is not configured. Set RESEND_API_KEY or SMTP_HOST."
    );
  }

  await sendViaSmtp(smtpConfig, payload);
}
