import crypto from "node:crypto";

export type PaymentMethod = "FPX" | "VISA" | "MASTERCARD";
export type PaymentMode = "FIAT" | "CRYPTO";

const METHODS: PaymentMethod[] = ["FPX", "VISA", "MASTERCARD"];

export function getPaymentMode(): PaymentMode {
  const mode = (process.env.PAYMENT_MODE ?? "FIAT").toUpperCase();
  return mode === "CRYPTO" ? "CRYPTO" : "FIAT";
}

export function parsePaymentMethod(value: FormDataEntryValue | null): PaymentMethod | null {
  if (!value || typeof value !== "string") {
    return null;
  }
  const upper = value.toUpperCase();
  return (METHODS as string[]).includes(upper) ? (upper as PaymentMethod) : null;
}

export async function processMockPayment(params: {
  method: PaymentMethod;
  amount: string;
  projectId: string;
  userId: string;
  purpose: "DEPOSIT" | "BALANCE";
}) {
  const reference = `MOCK-${params.purpose}-${crypto.randomUUID()}`;
  return {
    provider: "MOCK",
    reference,
    method: params.method,
    amount: params.amount,
  };
}

