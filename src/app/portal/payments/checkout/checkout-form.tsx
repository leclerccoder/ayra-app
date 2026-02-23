"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { completeFiatPaymentAction } from "../actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toSafeInternalPath } from "@/lib/inputSecurity";
import { useRouter } from "next/navigation";

const initialState = {
  error: undefined as string | undefined,
  redirectTo: undefined as string | undefined,
  success: undefined as boolean | undefined,
  receipt: undefined as Record<string, unknown> | undefined,
};

type FieldErrors = Partial<Record<
  | "bankName"
  | "bankUsername"
  | "bankPassword"
  | "cardNumber"
  | "cardName"
  | "cardExpiry"
  | "cardCvv",
  string
>>;

function stripDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
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

function isValidExpiry(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = Number(match[1]);
  const year = Number(match[2]) + 2000;
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expiryDate = new Date(year, month, 0, 23, 59, 59);
  return expiryDate >= now;
}

export function CheckoutForm({
  projectId,
  purpose,
  amount,
  projectTitle,
}: {
  projectId: string;
  purpose: "DEPOSIT" | "BALANCE";
  amount: string;
  projectTitle: string;
}) {
  const [state, formAction] = useActionState(
    completeFiatPaymentAction,
    initialState
  );
  const router = useRouter();
  const [method, setMethod] = useState<"FPX" | "VISA" | "MASTERCARD">("FPX");
  const [countdown, setCountdown] = useState(2);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [values, setValues] = useState({
    bankName: "Maybank",
    bankUsername: "",
    bankPassword: "",
    cardNumber: "",
    cardName: "",
    cardExpiry: "",
    cardCvv: "",
  });

  const isBanking = method === "FPX";

  const validateField = (field: keyof FieldErrors, value: string) => {
    if (isBanking) {
      if (field === "bankName" && !value.trim()) {
        return "Please select your bank.";
      }
      if (field === "bankUsername" && value.trim().length < 3) {
        return "Username must be at least 3 characters.";
      }
      if (field === "bankPassword" && value.trim().length < 6) {
        return "Password must be at least 6 characters.";
      }
      return "";
    }

    if (field === "cardNumber") {
      const digits = stripDigits(value);
      if (digits.length < 13 || digits.length > 19) {
        return "Card number length is invalid.";
      }
      if (!luhnCheck(digits)) {
        return "Card number failed validation.";
      }
    }
    if (field === "cardName" && value.trim().length < 2) {
      return "Name on card is too short.";
    }
    if (field === "cardExpiry" && !isValidExpiry(value)) {
      return "Use MM/YY and ensure it is not expired.";
    }
    if (field === "cardCvv") {
      const digits = stripDigits(value);
      if (digits.length < 3 || digits.length > 4) {
        return "CVV must be 3 or 4 digits.";
      }
    }

    return "";
  };

  const updateField = (field: keyof FieldErrors) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    const message = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: message || undefined }));
  };

  const validateAll = () => {
    const nextErrors: FieldErrors = {};
    if (isBanking) {
      (["bankName", "bankUsername", "bankPassword"] as const).forEach((field) => {
        const message = validateField(field, values[field]);
        if (message) nextErrors[field] = message;
      });
    } else {
      (["cardNumber", "cardName", "cardExpiry", "cardCvv"] as const).forEach((field) => {
        const message = validateField(field, values[field]);
        if (message) nextErrors[field] = message;
      });
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  useEffect(() => {
    setErrors({});
  }, [method]);

  const hasClientErrors = useMemo(() => Object.keys(errors).length > 0, [errors]);
  const safeRedirectTo = useMemo(
    () =>
      state.redirectTo
        ? toSafeInternalPath(state.redirectTo, `/portal/projects/${projectId}`)
        : undefined,
    [projectId, state.redirectTo]
  );

  useEffect(() => {
    if (!state.success || !safeRedirectTo) {
      return;
    }

    try {
      if (state.receipt) {
        const receipt = state.receipt as Record<string, string | undefined>;
        sessionStorage.setItem(
          `ayra:payment-receipt:${projectId}`,
          JSON.stringify({
            projectId,
            projectTitle,
            createdAt: new Date().toISOString(),
            purpose: receipt.purpose,
            method: receipt.method,
            reference: receipt.reference,
            amount: receipt.amount,
            bankName: receipt.bankName,
            cardLast4: receipt.cardLast4,
          })
        );
      }
    } catch {
      // Ignore storage failures (private mode / disabled storage)
    }

    setCountdown(2);
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const redirectTimer = setTimeout(() => {
      router.push(safeRedirectTo);
    }, 2000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimer);
    };
  }, [projectId, projectTitle, router, safeRedirectTo, state.receipt, state.success]);

  if (state.success && state.receipt) {
    const receipt = state.receipt as Record<string, string | undefined>;
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-6">
          <div className="flex items-center gap-3 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
            <div className="text-lg font-semibold">Payment Successful</div>
          </div>
          <div className="mt-4 space-y-2 text-sm text-emerald-700">
            <div>Reference: {receipt.reference}</div>
            <div>Method: {receipt.method}</div>
            <div>Amount: RM {receipt.amount}</div>
            {receipt.bankName && <div>Bank: {receipt.bankName}</div>}
            {receipt.cardLast4 && <div>Card: **** {receipt.cardLast4}</div>}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Redirecting back to the project in {countdown}s…
          </p>
          {safeRedirectTo && (
            <Button onClick={() => router.push(safeRedirectTo)} size="lg">
              Back to Project
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={(event) => {
        if (!validateAll()) {
          event.preventDefault();
        }
      }}
    >
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base ml-2">
            {state.error}
          </AlertDescription>
        </Alert>
      )}
      {hasClientErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base ml-2">
            Please fix the highlighted fields before proceeding.
          </AlertDescription>
        </Alert>
      )}

      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="purpose" value={purpose} />

      <div className="rounded-xl border-2 bg-muted/30 p-5">
        <div className="text-sm text-muted-foreground">Project</div>
        <div className="text-xl font-semibold">{projectTitle}</div>
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>{purpose === "DEPOSIT" ? "50% Deposit" : "50% Balance"}</span>
          <span className="text-base font-semibold text-foreground">RM {amount}</span>
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="paymentMethod" className="text-base font-medium">
          Payment Method
        </Label>
        <select
          id="paymentMethod"
          name="paymentMethod"
          required
          value={method}
          onChange={(event) =>
            setMethod(event.target.value as "FPX" | "VISA" | "MASTERCARD")
          }
          className="flex h-12 w-full rounded-lg border-2 border-input bg-background px-4 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="FPX">FPX (Online Banking)</option>
          <option value="VISA">Visa</option>
          <option value="MASTERCARD">Mastercard</option>
        </select>
        <p className="text-sm text-muted-foreground">
          Demo gateway only — no real charges are made.
        </p>
      </div>

      {method === "FPX" ? (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="bankName" className="text-base font-medium">
              Bank
            </Label>
            <select
              id="bankName"
              name="bankName"
              required={method === "FPX"}
              value={values.bankName}
              onChange={(event) => updateField("bankName")(event.target.value)}
              aria-invalid={Boolean(errors.bankName)}
              className={`flex h-12 w-full rounded-lg border-2 bg-background px-4 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                errors.bankName ? "border-destructive focus-visible:ring-destructive" : "border-input"
              }`}
            >
              <option value="Maybank">Maybank</option>
              <option value="CIMB">CIMB</option>
              <option value="RHB">RHB</option>
              <option value="Public Bank">Public Bank</option>
              <option value="Hong Leong Bank">Hong Leong Bank</option>
              <option value="Bank Islam">Bank Islam</option>
              <option value="Bank Rakyat">Bank Rakyat</option>
              <option value="AmBank">AmBank</option>
              <option value="UOB">UOB</option>
              <option value="OCBC">OCBC</option>
              <option value="HSBC">HSBC</option>
              <option value="Standard Chartered">Standard Chartered</option>
            </select>
            {errors.bankName && (
              <p className="text-sm text-destructive">{errors.bankName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankUsername" className="text-base font-medium">
              Username
            </Label>
            <Input
              id="bankUsername"
              name="bankUsername"
              placeholder="Your online banking username"
              className={`h-12 text-base ${errors.bankUsername ? "border-destructive focus-visible:ring-destructive" : ""}`}
              required={method === "FPX"}
              value={values.bankUsername}
              onChange={(event) => updateField("bankUsername")(event.target.value)}
              aria-invalid={Boolean(errors.bankUsername)}
            />
            {errors.bankUsername && (
              <p className="text-sm text-destructive">{errors.bankUsername}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankPassword" className="text-base font-medium">
              Password
            </Label>
            <Input
              id="bankPassword"
              name="bankPassword"
              type="password"
              placeholder="Your online banking password"
              className={`h-12 text-base ${errors.bankPassword ? "border-destructive focus-visible:ring-destructive" : ""}`}
              required
              value={values.bankPassword}
              onChange={(event) => updateField("bankPassword")(event.target.value)}
              aria-invalid={Boolean(errors.bankPassword)}
            />
            {errors.bankPassword && (
              <p className="text-sm text-destructive">{errors.bankPassword}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cardNumber" className="text-base font-medium">
              Card number
            </Label>
            <Input
              id="cardNumber"
              name="cardNumber"
              inputMode="numeric"
              placeholder="4111 1111 1111 1111"
              className={`h-12 text-base ${errors.cardNumber ? "border-destructive focus-visible:ring-destructive" : ""}`}
              required
              value={values.cardNumber}
              onChange={(event) => updateField("cardNumber")(event.target.value)}
              aria-invalid={Boolean(errors.cardNumber)}
            />
            {errors.cardNumber && (
              <p className="text-sm text-destructive">{errors.cardNumber}</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cardName" className="text-base font-medium">
              Name on card
            </Label>
            <Input
              id="cardName"
              name="cardName"
              placeholder="CARDHOLDER NAME"
              className={`h-12 text-base ${errors.cardName ? "border-destructive focus-visible:ring-destructive" : ""}`}
              required
              value={values.cardName}
              onChange={(event) => updateField("cardName")(event.target.value)}
              aria-invalid={Boolean(errors.cardName)}
            />
            {errors.cardName && (
              <p className="text-sm text-destructive">{errors.cardName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardExpiry" className="text-base font-medium">
              Expiry (MM/YY)
            </Label>
            <Input
              id="cardExpiry"
              name="cardExpiry"
              placeholder="12/28"
              className={`h-12 text-base ${errors.cardExpiry ? "border-destructive focus-visible:ring-destructive" : ""}`}
              required
              value={values.cardExpiry}
              onChange={(event) => updateField("cardExpiry")(event.target.value)}
              aria-invalid={Boolean(errors.cardExpiry)}
            />
            {errors.cardExpiry && (
              <p className="text-sm text-destructive">{errors.cardExpiry}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cardCvv" className="text-base font-medium">
              CVV
            </Label>
            <Input
              id="cardCvv"
              name="cardCvv"
              inputMode="numeric"
              placeholder="123"
              className={`h-12 text-base ${errors.cardCvv ? "border-destructive focus-visible:ring-destructive" : ""}`}
              required
              value={values.cardCvv}
              onChange={(event) => updateField("cardCvv")(event.target.value)}
              aria-invalid={Boolean(errors.cardCvv)}
            />
            {errors.cardCvv && (
              <p className="text-sm text-destructive">{errors.cardCvv}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border-2 bg-background p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          Secure demo environment · No real money is processed
        </div>
        <div>RM {amount}</div>
      </div>

      <Button type="submit" size="lg" className="h-12 w-full text-base">
        Proceed Payment
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </form>
  );
}
