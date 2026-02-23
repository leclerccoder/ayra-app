import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sanitizeTextInput } from "@/lib/inputSecurity";

const CODE_TTL_MINUTES = Number(process.env.MFA_CODE_TTL_MINUTES ?? "10");
const CLIENT_REGISTRATION_PURPOSE = "client_register_verify";

export function getAdminMfaCode() {
  const code = process.env.ADMIN_MFA_CODE;
  return code ? code.trim() : "";
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendMfaCode(params: {
  userId: string;
  email: string;
  purpose?: string;
}) {
  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

  await prisma.mfaCode.create({
    data: {
      userId: params.userId,
      codeHash,
      purpose: params.purpose,
      expiresAt,
    },
  });

  const isClientRegistration = params.purpose === CLIENT_REGISTRATION_PURPOSE;
  const subject = isClientRegistration
    ? "Verify your Ayra client account"
    : "Your Ayra verification code";
  const flowLabel = isClientRegistration
    ? "Complete your account setup"
    : "Security verification required";
  const guidance = isClientRegistration
    ? "Use this code to finish registration and activate your client dashboard."
    : "Use this code to continue your secure action in Ayra Portal.";
  const escapedEmail = escapeHtml(params.email);
  const escapedCode = escapeHtml(code);

  await sendEmail({
    to: params.email,
    subject,
    text:
      `Ayra Portal verification code: ${code}\n` +
      `Expires in ${CODE_TTL_MINUTES} minutes.\n` +
      `${guidance}`,
    html: `
      <div style="margin:0;padding:28px;background:#f1f5f9;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;border-radius:20px;overflow:hidden;background:#ffffff;border:1px solid #dbe5f0;">
          <tr>
            <td style="padding:24px 28px;background:linear-gradient(135deg,#1e293b,#334155 45%,#0ea5e9);color:#f8fafc;">
              <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">Ayra Portal</p>
              <h1 style="margin:0;font-size:24px;line-height:1.25;">${flowLabel}</h1>
              <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#e2e8f0;">
                A verification code was requested for <strong>${escapedEmail}</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#334155;">
                ${guidance}
              </p>
              <div style="margin:0 0 18px;padding:18px;border:1px dashed #cbd5e1;border-radius:14px;background:#f8fafc;text-align:center;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Verification code</p>
                <p style="margin:0;font-size:36px;line-height:1;font-weight:700;letter-spacing:0.22em;color:#0f172a;">${escapedCode}</p>
              </div>
              <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:0 0 14px;">
                <tr>
                  <td style="padding:12px 14px;border-radius:10px;background:#e0f2fe;color:#0c4a6e;font-size:13px;line-height:1.55;">
                    This code expires in <strong>${CODE_TTL_MINUTES} minutes</strong> and can only be used once.
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;line-height:1.55;color:#64748b;">
                If you did not request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </div>
    `,
  });

  return { expiresAt };
}

export async function verifyMfaCode(params: {
  userId: string;
  code: string;
  purpose?: string;
}) {
  const normalized = sanitizeTextInput(params.code, {
    allowNewlines: false,
    maxLength: 6,
  });
  if (!normalized) {
    throw new Error("Admin verification code is required.");
  }

  const record = await prisma.mfaCode.findFirst({
    where: {
      userId: params.userId,
      codeHash: hashCode(normalized),
      usedAt: null,
      expiresAt: { gt: new Date() },
      ...(params.purpose ? { purpose: params.purpose } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new Error("Invalid or expired MFA code.");
  }

  await prisma.mfaCode.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });
}

export async function assertAdminMfa(
  formData: FormData,
  user: { id: string; email: string },
  purpose?: string
) {
  const provided = sanitizeTextInput(formData.get("mfaCode"), {
    allowNewlines: false,
    maxLength: 6,
  });
  if (!provided) {
    throw new Error("Admin verification code is required.");
  }

  const staticCode = getAdminMfaCode();
  if (staticCode && provided === staticCode) {
    return;
  }

  await verifyMfaCode({ userId: user.id, code: provided, purpose });
}
