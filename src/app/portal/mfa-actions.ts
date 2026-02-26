"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getSanitizedOptionalFormText } from "@/lib/inputSecurity";
import { sendMfaCode } from "@/lib/mfa";

type FormState = {
  error?: string;
  message?: string;
  expiresAt?: string;
};

const requestSchema = z.object({
  purpose: z.string().min(1).optional(),
});

export async function requestMfaCodeAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Please sign in." };
  }
  if (user.role !== "ADMIN" && user.role !== "DESIGNER") {
    return { error: "Admin or designer access required." };
  }

  const parsed = requestSchema.safeParse({
    purpose: getSanitizedOptionalFormText(formData, "purpose", {
      allowNewlines: false,
      maxLength: 64,
    }),
  });
  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  try {
    const result = await sendMfaCode({
      userId: user.id,
      email: user.email,
      purpose: parsed.data.purpose,
    });
    return {
      message: `Code sent to ${user.email}.`,
      expiresAt: result.expiresAt.toISOString(),
    };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
