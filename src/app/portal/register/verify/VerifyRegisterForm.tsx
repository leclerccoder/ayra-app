"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  resendClientRegistrationCodeAction,
  verifyClientRegistrationAction,
} from "../../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Clock3, Loader2, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type FormState = {
  error?: string;
  message?: string;
  expiresAt?: string;
};

const initialState: FormState = {};
const FALLBACK_EXPIRY_MINUTES = 10;

function resolveExpiryTimestamp(value?: string) {
  if (!value) return Date.now() + FALLBACK_EXPIRY_MINUTES * 60_000;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return Date.now() + FALLBACK_EXPIRY_MINUTES * 60_000;
  return parsed;
}

function formatTimeRemaining(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function VerifyButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full h-12 text-base"
      disabled={disabled || pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Verifying...
        </>
      ) : (
        "Verify and continue"
      )}
    </Button>
  );
}

function ResendButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      className="h-12 text-base"
      disabled={disabled || pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : (
        "Resend code"
      )}
    </Button>
  );
}

export default function VerifyRegisterForm({
  initialEmail,
  initialExpiresAt,
}: {
  initialEmail: string;
  initialExpiresAt: string;
}) {
  const [verifyState, verifyAction] = useActionState(
    verifyClientRegistrationAction,
    initialState
  );
  const [resendState, resendAction] = useActionState(
    resendClientRegistrationCodeAction,
    initialState
  );
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [touched, setTouched] = useState({ email: false, code: false });
  const [submitted, setSubmitted] = useState(false);

  const activeExpiresAtMs = useMemo(
    () => resolveExpiryTimestamp(resendState.expiresAt ?? initialExpiresAt),
    [initialExpiresAt, resendState.expiresAt]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const errors = useMemo(() => {
    const next: { email?: string; code?: string } = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      next.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      next.email = "Enter a valid email address.";
    }

    if (!code.trim()) {
      next.code = "Verification code is required.";
    } else if (!/^\d{6}$/.test(code.trim())) {
      next.code = "Verification code must be 6 digits.";
    }
    return next;
  }, [code, email]);

  const showError = (field: "email" | "code") =>
    (touched[field] || submitted) && errors[field];

  const hasErrors = Object.keys(errors).length > 0;
  const secondsLeft = Math.max(0, Math.ceil((activeExpiresAtMs - nowMs) / 1000));
  const codeExpired = secondsLeft <= 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-10">
      <Card className="w-full max-w-xl border-2 shadow-xl">
        <CardHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <MailCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-3xl">Verify your email</CardTitle>
          <CardDescription className="text-base">
            Enter the 6-digit code sent to your email to activate your client account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Alert
            variant={codeExpired ? "destructive" : "default"}
            className={cn(!codeExpired && "border-primary/20 bg-primary/5")}
          >
            <Clock3 className="h-4 w-4" />
            <AlertDescription className="text-base font-medium">
              {codeExpired
                ? "Verification code expired. Request a new code below."
                : `Code expires in ${formatTimeRemaining(secondsLeft)}.`}
            </AlertDescription>
          </Alert>

          {verifyState.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-base">{verifyState.error}</AlertDescription>
            </Alert>
          )}
          {resendState.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-base">{resendState.error}</AlertDescription>
            </Alert>
          )}
          {resendState.message && (
            <Alert>
              <AlertDescription className="text-lg font-semibold">
                {resendState.message}
              </AlertDescription>
            </Alert>
          )}

          <form
            action={verifyAction}
            className="space-y-5"
            onSubmit={(event) => {
              setSubmitted(true);
              if (hasErrors || codeExpired) {
                event.preventDefault();
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="verify-email" className="text-base">
                Email
              </Label>
              <Input
                id="verify-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                aria-invalid={!!showError("email")}
                className={cn(
                  "h-11 text-base",
                  showError("email") && "border-destructive focus-visible:ring-destructive"
                )}
                required
              />
              {showError("email") && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify-code" className="text-base">
                Verification code
              </Label>
              <Input
                id="verify-code"
                name="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                onBlur={() => setTouched((prev) => ({ ...prev, code: true }))}
                aria-invalid={!!showError("code")}
                className={cn(
                  "h-11 text-base tracking-[0.3em] font-medium",
                  showError("code") && "border-destructive focus-visible:ring-destructive"
                )}
                required
              />
              {showError("code") && (
                <p className="text-sm text-destructive">{errors.code}</p>
              )}
            </div>

            <VerifyButton disabled={hasErrors || codeExpired} />
          </form>

          <form action={resendAction} className="flex items-center justify-between gap-3">
            <input type="hidden" name="email" value={email.trim()} />
            <p className="text-sm text-muted-foreground">
              Didn’t receive it? Check spam or request a new code.
            </p>
            <ResendButton disabled={!email.trim()} />
          </form>

          <p className="text-sm text-muted-foreground">
            Wrong email?{" "}
            <Link href="/portal/register" className="text-primary hover:underline underline-offset-4">
              Back to registration
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
