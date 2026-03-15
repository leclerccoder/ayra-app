import { z } from "zod";

export const ENQUIRY_PHONE_MIN_DIGITS = 7;
export const ENQUIRY_PHONE_MAX_DIGITS = 11;

const quotedAmountPattern = /^\d+(\.\d{1,2})?$/;

export function normalizePhoneNumberInput(value: string) {
  return value.replace(/\D+/g, "").slice(0, ENQUIRY_PHONE_MAX_DIGITS);
}

export function normalizeQuotedAmountInput(value: string) {
  return value.replace(/,/g, "").trim();
}

export const enquiryPhoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required.")
  .regex(/^\d+$/, "Phone number must contain digits only.")
  .min(
    ENQUIRY_PHONE_MIN_DIGITS,
    `Phone number must be at least ${ENQUIRY_PHONE_MIN_DIGITS} digits.`
  )
  .max(
    ENQUIRY_PHONE_MAX_DIGITS,
    `Phone number must be at most ${ENQUIRY_PHONE_MAX_DIGITS} digits.`
  );

export const quotedAmountSchema = z
  .string()
  .transform((value) => normalizeQuotedAmountInput(value))
  .refine((value) => quotedAmountPattern.test(value), "Enter a valid amount.");
