"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { createLocalWallet, fundWallet } from "@/lib/blockchain";
import { ensureUserWallet } from "@/lib/userWallet";
import { deriveInviteCode, hashInviteToken } from "@/lib/adminInvite";
import { getSanitizedFormText } from "@/lib/inputSecurity";
import { getFirstPasswordPolicyError } from "@/lib/passwordPolicy";

export type AcceptAdminInviteState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"username" | "password" | "confirmPassword" | "invitationCode", string>
  >;
};

const acceptSchema = z
  .object({
    token: z.string().min(10, "Invalid invitation token."),
    username: z.string().min(2, "Username must be at least 2 characters."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(128, "Password is too long."),
    confirmPassword: z.string().min(8, "Please confirm your password."),
    invitationCode: z
      .string()
      .regex(/^\d{6}$/, "Invitation code must be 6 digits."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function acceptAdminInviteAction(
  _: AcceptAdminInviteState,
  formData: FormData
): Promise<AcceptAdminInviteState> {
  const parsed = acceptSchema.safeParse({
    token: getSanitizedFormText(formData, "token", {
      allowNewlines: false,
      normalizeUnicode: false,
      maxLength: 512,
    }),
    username: getSanitizedFormText(formData, "username", {
      allowNewlines: false,
      maxLength: 160,
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
    invitationCode: getSanitizedFormText(formData, "invitationCode", {
      allowNewlines: false,
      maxLength: 6,
    }),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
      fieldErrors: {
        username: fieldErrors.username?.[0],
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
        invitationCode: fieldErrors.invitationCode?.[0],
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

  const tokenHash = hashInviteToken(parsed.data.token);
  const invite = await prisma.adminInvite.findUnique({
    where: { tokenHash },
  });

  if (!invite) {
    return { error: "Invitation link is invalid or has expired." };
  }

  if (invite.acceptedAt) {
    return { error: "This invitation has already been used." };
  }

  if (invite.expiresAt < new Date()) {
    return { error: "This invitation has expired." };
  }

  const expectedCode = deriveInviteCode(parsed.data.token);
  const providedCode = parsed.data.invitationCode.trim();
  const matchesCode =
    providedCode.length === expectedCode.length &&
    crypto.timingSafeEqual(Buffer.from(providedCode), Buffer.from(expectedCode));
  if (!matchesCode) {
    return {
      error: "Invitation code is invalid.",
      fieldErrors: { invitationCode: "Invitation code is invalid." },
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  let user = await prisma.user.findFirst({
    where: { email: { equals: invite.email, mode: "insensitive" } },
  });

  if (user && user.role === "ADMIN") {
    if (invite.role === "ADMIN") {
      return { error: "This account is already an admin. Please sign in." };
    }
    return { error: "This account is already an admin. Use another email for designer access." };
  }

  if (user && user.role === "DESIGNER" && invite.role === "DESIGNER") {
    return { error: "This account is already a designer. Please sign in." };
  }

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.username,
        passwordHash,
        role: invite.role,
        emailVerified: true,
      },
    });
  } else {
    const wallet = createLocalWallet();
    user = await prisma.user.create({
      data: {
        name: parsed.data.username,
        email: invite.email,
        passwordHash,
        role: invite.role,
        emailVerified: true,
        walletAddress: wallet.address,
        walletPrivateKey: wallet.privateKey,
      },
    });

    try {
      await fundWallet(wallet.address, "2.0");
    } catch (error) {
      console.warn("Wallet funding failed:", error);
    }
  }

  await prisma.adminInvite.update({
    where: { id: invite.id },
    data: {
      acceptedAt: new Date(),
      acceptedUserId: user.id,
    },
  });

  await ensureUserWallet(user.id);
  await createSession(user.id);
  redirect("/portal");
}
