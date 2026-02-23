"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword, verifyPassword } from "@/lib/auth";
import { createLocalWallet, fundWallet } from "@/lib/blockchain";
import { sendMfaCode, verifyMfaCode } from "@/lib/mfa";
import { getSanitizedFormText } from "@/lib/inputSecurity";
import { getFirstPasswordPolicyError } from "@/lib/passwordPolicy";

type FormState = {
  error?: string;
  message?: string;
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

const CLIENT_REGISTRATION_PURPOSE = "client_register_verify";

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

  try {
    await sendMfaCode({
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

  redirect(`/portal/register/verify?email=${encodeURIComponent(userEmail)}`);
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
    await sendMfaCode({
      userId: user.id,
      email: user.email,
      purpose: CLIENT_REGISTRATION_PURPOSE,
    });
  } catch (error) {
    return {
      error:
        (error as Error).message ??
        "Failed to resend verification code. Please try again.",
    };
  }

  return { message: `Verification code sent to ${user.email}.` };
}
