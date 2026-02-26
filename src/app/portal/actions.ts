"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { createLocalWallet, fundWallet } from "@/lib/blockchain";
import { sendMfaCode, verifyMfaCode } from "@/lib/mfa";
import { sendEmail } from "@/lib/email";
import {
  getSanitizedFormText,
  sanitizeForwardedProtocol,
  sanitizeHostHeader,
} from "@/lib/inputSecurity";
import { getFirstPasswordPolicyError } from "@/lib/passwordPolicy";

type FormState = {
  error?: string;
  message?: string;
  expiresAt?: string;
};

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
  confirmPassword: z.string().min(8, "Please confirm your password."),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long."),
});

const verifyClientRegistrationSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Verification code must be 6 digits."),
});

const resendClientRegistrationSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(16, "Reset link is invalid."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password is too long."),
    confirmPassword: z.string().min(8, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const CLIENT_REGISTRATION_PURPOSE = "client_register_verify";
const PASSWORD_RESET_TTL_MINUTES = Number(
  process.env.PASSWORD_RESET_TTL_MINUTES ?? "30"
);

function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function getAppUrl() {
  const configuredBase = (process.env.APP_URL ?? "").trim();
  let configuredOrigin = "";
  let configuredHost: string | null = null;

  if (configuredBase) {
    try {
      const parsed = new URL(configuredBase);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        const safeHost = sanitizeHostHeader(parsed.host);
        if (safeHost) {
          configuredHost = safeHost;
          configuredOrigin = `${parsed.protocol}//${safeHost}`;
        }
      }
    } catch {
      configuredOrigin = "";
      configuredHost = null;
    }
  }

  const configuredIsLocal =
    !configuredOrigin ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredOrigin);

  const requestHeaders = await headers();
  const forwardedHost = sanitizeHostHeader(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  );
  const forwardedProto = sanitizeForwardedProtocol(
    requestHeaders.get("x-forwarded-proto")
  );

  if (
    forwardedHost &&
    (configuredIsLocal ||
      forwardedHost.endsWith("trycloudflare.com") ||
      forwardedHost === configuredHost)
  ) {
    const protocol =
      forwardedProto ??
      (forwardedHost.startsWith("localhost") || forwardedHost.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${protocol}://${forwardedHost}`;
  }

  if (configuredOrigin) {
    return configuredOrigin;
  }

  return "http://localhost:3000";
}

export async function registerAction(_: FormState, formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: getSanitizedFormText(formData, "name", {
      allowNewlines: false,
      maxLength: 160,
    }),
    email: getSanitizedFormText(formData, "email", {
      allowNewlines: false,
      maxLength: 320,
    }),
    password: getSanitizedFormText(formData, "password", {
      trim: false,
      allowNewlines: false,
      normalizeUnicode: false,
      maxLength: 128,
    }),
    confirmPassword: getSanitizedFormText(formData, "confirmPassword", {
      trim: false,
      allowNewlines: false,
      normalizeUnicode: false,
      maxLength: 128,
    }),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const passwordPolicyError = getFirstPasswordPolicyError(parsed.data.password);
  if (passwordPolicyError) {
    return { error: passwordPolicyError };
  }

  const normalizedEmail = parsed.data.email.trim();
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });

  let userId = "";
  let userEmail = normalizedEmail.toLowerCase();

  if (existingUser) {
    if (existingUser.role !== "CLIENT") {
      return {
        error:
          "This email belongs to a staff account. Client registration is not allowed for this email.",
      };
    }
    if (existingUser.emailVerified) {
      return { error: "An account with this email already exists." };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: parsed.data.name,
        passwordHash,
      },
      select: { id: true, email: true },
    });
    userId = updated.id;
    userEmail = updated.email;
  } else {
    const passwordHash = await hashPassword(parsed.data.password);
    const wallet = createLocalWallet();
    const created = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: userEmail,
        passwordHash,
        role: "CLIENT",
        emailVerified: false,
        walletAddress: wallet.address,
        walletPrivateKey: wallet.privateKey,
      },
      select: { id: true, email: true, walletAddress: true },
    });
    userId = created.id;
    userEmail = created.email;

    if (created.walletAddress) {
      try {
        await fundWallet(created.walletAddress, "2.0");
      } catch (error) {
        console.warn("Wallet funding failed:", error);
      }
    }
  }

  let result: { expiresAt: Date };
  try {
    result = await sendMfaCode({
      userId,
      email: userEmail,
      purpose: CLIENT_REGISTRATION_PURPOSE,
    });
  } catch (error) {
    return {
      error:
        (error as Error).message ??
        "Failed to send verification code. Please try again.",
    };
  }

  redirect(
    `/portal/register/verify?email=${encodeURIComponent(userEmail)}&expiresAt=${encodeURIComponent(result.expiresAt.toISOString())}`
  );
}

export async function loginAction(_: FormState, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: getSanitizedFormText(formData, "email", {
      allowNewlines: false,
      maxLength: 320,
    }),
    password: getSanitizedFormText(formData, "password", {
      trim: false,
      allowNewlines: false,
      normalizeUnicode: false,
      maxLength: 128,
    }),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const normalizedEmail = parsed.data.email.trim();
  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });

  if (!user) {
    return { error: "Invalid email or password." };
  }

  if (!user.emailVerified) {
    return {
      error:
        "Please verify your email before signing in. Continue from the verification page.",
    };
  }

  const validPassword = await verifyPassword(
    parsed.data.password,
    user.passwordHash
  );

  if (!validPassword) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id);
  redirect("/portal");
}

export async function logoutAction() {
  const { clearSession } = await import("@/lib/auth");
  await clearSession();
  redirect("/portal/login");
}

export async function verifyClientRegistrationAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = verifyClientRegistrationSchema.safeParse({
    email: getSanitizedFormText(formData, "email", {
      allowNewlines: false,
      maxLength: 320,
    }),
    code: getSanitizedFormText(formData, "code", {
      allowNewlines: false,
      maxLength: 6,
    }),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, role: "CLIENT" },
    select: { id: true, emailVerified: true },
  });

  if (!user) {
    return { error: "No pending client registration found for this email." };
  }

  if (user.emailVerified) {
    await createSession(user.id);
    redirect("/portal");
  }

  try {
    await verifyMfaCode({
      userId: user.id,
      code: parsed.data.code,
      purpose: CLIENT_REGISTRATION_PURPOSE,
    });
  } catch {
    return { error: "Invalid or expired verification code." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true },
  });
  await createSession(user.id);
  redirect("/portal");
}

export async function resendClientRegistrationCodeAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = resendClientRegistrationSchema.safeParse({
    email: getSanitizedFormText(formData, "email", {
      allowNewlines: false,
      maxLength: 320,
    }),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      role: "CLIENT",
      emailVerified: false,
    },
    select: { id: true, email: true },
  });

  if (!user) {
    return { error: "No pending verification found for this email." };
  }

  try {
    const result = await sendMfaCode({
      userId: user.id,
      email: user.email,
      purpose: CLIENT_REGISTRATION_PURPOSE,
    });
    return {
      message: `Verification code sent to ${user.email}.`,
      expiresAt: result.expiresAt.toISOString(),
    };
  } catch (error) {
    return {
      error:
        (error as Error).message ??
        "Failed to resend verification code. Please try again.",
    };
  }
}

export async function requestPasswordResetAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: getSanitizedFormText(formData, "email", {
      allowNewlines: false,
      maxLength: 320,
    }),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const genericResponse: FormState = {
    message:
      "If an account exists for this email, a password reset link has been sent.",
  };

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    return genericResponse;
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000);
  const appUrl = await getAppUrl();
  const resetUrl = `${appUrl}/portal/reset-password/${token}`;
  const escapedEmail = escapeHtml(user.email);
  const escapedResetUrl = escapeHtml(resetUrl);

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your Ayra Portal password",
      text:
        `A password reset was requested for ${user.email}.\n\n` +
        `Reset your password using this link:\n${resetUrl}\n\n` +
        `This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.\n` +
        `If you did not request this, you can ignore this email.`,
      html: `
        <div style="margin:0;padding:28px;background:#f1f5f9;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;border-radius:20px;overflow:hidden;background:#ffffff;border:1px solid #dbe5f0;">
            <tr>
              <td style="padding:24px 28px;background:linear-gradient(135deg,#0f172a,#1d4ed8 58%,#0ea5e9);color:#f8fafc;">
                <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Ayra Portal</p>
                <h1 style="margin:0;font-size:24px;line-height:1.25;">Password reset request</h1>
                <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#e2e8f0;">
                  Use the secure link below to set a new password.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:#475569;">
                  Requested account:
                  <span style="font-weight:600;color:#0f172a;">${escapedEmail}</span>
                </p>
                <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">
                  This link is valid for <strong>${PASSWORD_RESET_TTL_MINUTES} minutes</strong> and can only be used once.
                </p>
                <div style="margin:0 0 16px;">
                  <a href="${escapedResetUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;">
                    Reset password
                  </a>
                </div>
                <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;word-break:break-all;">
                  Link: <a href="${escapedResetUrl}" style="color:#0f172a;">${escapedResetUrl}</a>
                </p>
                <p style="margin:12px 0 0;font-size:13px;line-height:1.55;color:#64748b;">
                  If you did not request this change, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `,
    });
  } catch {
    return { error: "Failed to send reset email. Please try again." };
  }

  return genericResponse;
}

export type ResetPasswordState = {
  error?: string;
  fieldErrors?: Partial<Record<"password" | "confirmPassword", string>>;
};

export async function resetPasswordAction(
  _: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    token: getSanitizedFormText(formData, "token", {
      allowNewlines: false,
      normalizeUnicode: false,
      maxLength: 512,
    }),
    password: getSanitizedFormText(formData, "password", {
      trim: false,
      allowNewlines: false,
      normalizeUnicode: false,
      maxLength: 128,
    }),
    confirmPassword: getSanitizedFormText(formData, "confirmPassword", {
      trim: false,
      allowNewlines: false,
      normalizeUnicode: false,
      maxLength: 128,
    }),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      fieldErrors: {
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      },
    };
  }

  const passwordPolicyError = getFirstPasswordPolicyError(parsed.data.password);
  if (passwordPolicyError) {
    return {
      error: passwordPolicyError,
      fieldErrors: { password: passwordPolicyError },
    };
  }

  const tokenHash = hashToken(parsed.data.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    return { error: "Reset link is invalid or has expired." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  redirect("/portal/login?reset=success");
}
