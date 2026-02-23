"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordBalanceFiat, recordDepositFiat } from "@/lib/blockchain";
import { notifyAdmins, notifyUsers } from "@/lib/notifications";
import { ensureUserWallet } from "@/lib/userWallet";
import { parsePaymentMethod, processMockPayment } from "@/lib/paymentGateway";
import {
  getSanitizedFormText,
  getSanitizedOptionalFormText,
  toSafeInternalPath,
} from "@/lib/inputSecurity";

type PaymentFormState = {
  error?: string;
  redirectTo?: string;
  success?: boolean;
  receipt?: Record<string, unknown>;
};

const paymentSchema = z.object({
  projectId: z.string().min(1),
  purpose: z.enum(["DEPOSIT", "BALANCE"]),
  paymentMethod: z.string().min(1),
  bankName: z.string().optional(),
  accountName: z.string().optional(),
  accountNumber: z.string().optional(),
  bankUsername: z.string().optional(),
  bankPassword: z.string().optional(),
  cardNumber: z.string().optional(),
  cardName: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvv: z.string().optional(),
});

function stripDigits(value: string | undefined) {
  if (!value) return "";
  return value.replace(/[^0-9]/g, "");
}

function isValidExpiry(value: string | undefined) {
  if (!value) return false;
  const match = value.trim().match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = Number(match[1]);
  const year = Number(match[2]) + 2000;
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expiryDate = new Date(year, month, 0, 23, 59, 59);
  return expiryDate >= now;
}

function luhnCheck(value: string) {
  let sum = 0;
  let shouldDouble = false;
  for (let i = value.length - 1; i >= 0; i -= 1) {
    let digit = Number(value[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export async function completeFiatPaymentAction(
  _: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Please sign in." };
    }

    const parsed = paymentSchema.safeParse({
      projectId: getSanitizedFormText(formData, "projectId", {
        allowNewlines: false,
        maxLength: 128,
      }),
      purpose: getSanitizedFormText(formData, "purpose", {
        allowNewlines: false,
        maxLength: 16,
      }),
      paymentMethod: getSanitizedFormText(formData, "paymentMethod", {
        allowNewlines: false,
        maxLength: 32,
      }),
      bankName: getSanitizedOptionalFormText(formData, "bankName", {
        allowNewlines: false,
        maxLength: 120,
      }),
      accountName: getSanitizedOptionalFormText(formData, "accountName", {
        allowNewlines: false,
        maxLength: 160,
      }),
      accountNumber: getSanitizedOptionalFormText(formData, "accountNumber", {
        allowNewlines: false,
        maxLength: 48,
      }),
      bankUsername: getSanitizedOptionalFormText(formData, "bankUsername", {
        allowNewlines: false,
        maxLength: 120,
      }),
      bankPassword: getSanitizedOptionalFormText(formData, "bankPassword", {
        trim: false,
        allowNewlines: false,
        normalizeUnicode: false,
        maxLength: 128,
      }),
      cardNumber: getSanitizedOptionalFormText(formData, "cardNumber", {
        allowNewlines: false,
        maxLength: 32,
      }),
      cardName: getSanitizedOptionalFormText(formData, "cardName", {
        allowNewlines: false,
        maxLength: 120,
      }),
      cardExpiry: getSanitizedOptionalFormText(formData, "cardExpiry", {
        allowNewlines: false,
        maxLength: 8,
      }),
      cardCvv: getSanitizedOptionalFormText(formData, "cardCvv", {
        allowNewlines: false,
        maxLength: 4,
      }),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });

    if (!project) {
      return { error: "Project not found." };
    }

    if (project.clientId !== user.id) {
      return { error: "Only the client can make this payment." };
    }

    if (project.escrowPaused) {
      return { error: "Escrow actions are currently paused by the admin." };
    }

    if (!project.escrowAddress) {
      return { error: "Escrow contract not deployed yet." };
    }

    if (parsed.data.purpose === "DEPOSIT" && project.status !== "DRAFT") {
      return { error: "Deposit already funded or project not ready." };
    }

    if (parsed.data.purpose === "BALANCE" && project.status !== "DRAFT_SUBMITTED") {
      return { error: "Draft is not ready for approval." };
    }

    const method = parsePaymentMethod(parsed.data.paymentMethod);
    if (!method) {
      return { error: "Please choose a valid payment method." };
    }

    if (method === "FPX") {
      const bankName = parsed.data.bankName?.trim();
      const bankUsername = parsed.data.bankUsername?.trim();
      const bankPassword = parsed.data.bankPassword?.trim();
      if (!bankName || !bankUsername || !bankPassword) {
        return { error: "Please enter your bank, username, and password." };
      }
      if (bankUsername.length < 3) {
        return { error: "Bank username is too short." };
      }
      if (bankPassword.length < 6) {
        return { error: "Bank password is too short." };
      }
    } else {
      const cardNumber = stripDigits(parsed.data.cardNumber);
      const cardCvv = stripDigits(parsed.data.cardCvv);
      const cardName = parsed.data.cardName?.trim();
      if (!cardNumber || !cardName || !parsed.data.cardExpiry || !cardCvv) {
        return { error: "Please enter your card details." };
      }
      if (cardNumber.length < 13 || cardNumber.length > 19 || !luhnCheck(cardNumber)) {
        return { error: "Card number is invalid." };
      }
      if (!isValidExpiry(parsed.data.cardExpiry)) {
        return { error: "Card expiry must be in MM/YY and not expired." };
      }
      if (cardCvv.length < 3 || cardCvv.length > 4) {
        return { error: "CVV must be 3 or 4 digits." };
      }
      if (cardName.length < 2) {
        return { error: "Name on card is too short." };
      }
    }

    const amount =
      parsed.data.purpose === "DEPOSIT"
        ? project.depositAmount.toString()
        : project.balanceAmount.toString();

    const payment = await processMockPayment({
      method,
      amount,
      projectId: project.id,
      userId: user.id,
      purpose: parsed.data.purpose,
    });

    if (!project.adminId) {
      return { error: "Project admin not assigned." };
    }

    const admin = await ensureUserWallet(project.adminId);
    if (!admin.walletPrivateKey) {
      return { error: "Admin wallet not available." };
    }

    let txHash = "";
    try {
      if (parsed.data.purpose === "DEPOSIT") {
        const tx = await recordDepositFiat(
          project.escrowAddress,
          admin.walletPrivateKey
        );
        txHash = tx.hash;
      } else {
        const tx = await recordBalanceFiat(
          project.escrowAddress,
          admin.walletPrivateKey
        );
        txHash = tx.hash;
      }
    } catch (error) {
      return {
        error:
          "This escrow contract was deployed before the FIAT demo update. Please create a new project.",
      };
    }

    const cardNumberSanitized = stripDigits(parsed.data.cardNumber);
    const cardLast4 =
      cardNumberSanitized.length >= 4
        ? cardNumberSanitized.slice(-4)
        : undefined;

    const metadata = {
      mode: "FIAT",
      provider: payment.provider,
      method: payment.method,
      reference: payment.reference,
      bankName: parsed.data.bankName?.trim(),
      bankUsername: parsed.data.bankUsername?.trim(),
      cardLast4,
      cardName: parsed.data.cardName?.trim(),
    };

    if (parsed.data.purpose === "DEPOSIT") {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: "FUNDED",
          timeline: {
            create: {
              actorId: user.id,
              eventType: "DEPOSIT_FUNDED",
              message: "Client paid the 50% deposit via fiat gateway (demo).",
              txHash,
            },
          },
          payments: {
            create: {
              type: "DEPOSIT",
              status: "COMPLETED",
              amount: project.depositAmount,
              txHash,
              metadata,
            },
          },
          chainEvents: {
            create: {
              eventName: "DepositFunded",
              txHash,
              payload: {
                amount,
                ...metadata,
              },
            },
          },
        },
      });

      await notifyAdmins(
        "Deposit funded",
        `Deposit received for project "${project.title}".`
      );
    } else {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: "APPROVED",
          timeline: {
            create: {
              actorId: user.id,
              eventType: "DRAFT_APPROVED",
              message: "Client approved the draft and paid the balance via fiat gateway (demo).",
              txHash,
            },
          },
          payments: {
            create: {
              type: "BALANCE",
              status: "COMPLETED",
              amount: project.balanceAmount,
              txHash,
              metadata,
            },
          },
          chainEvents: {
            create: {
              eventName: "BalanceFunded",
              txHash,
              payload: {
                amount,
                ...metadata,
              },
            },
          },
        },
      });

      await notifyAdmins(
        "Draft approved",
        `Client approved the draft for "${project.title}" and funded the balance.`
      );
    }

    await notifyUsers(
      [project.clientId],
      "Payment recorded",
      `Payment recorded for "${project.title}" via demo gateway.`
    );

    return {
      success: true,
      redirectTo: toSafeInternalPath(`/portal/projects/${project.id}`, "/portal/projects"),
      receipt: {
        purpose: parsed.data.purpose,
        method: payment.method,
        reference: payment.reference,
        amount,
        bankName: parsed.data.bankName,
        bankUsername: parsed.data.bankUsername,
        cardLast4,
      },
    };
  } catch (error) {
    return { error: (error as Error).message };
  }
}
