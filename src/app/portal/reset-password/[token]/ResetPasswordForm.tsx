"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { resetPasswordAction, type ResetPasswordState } from "../../actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getFirstPasswordPolicyError,
  getPasswordRuleStates,
  getPasswordStrength,
} from "@/lib/passwordPolicy";

const initialState: ResetPasswordState = {};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full h-12 text-base" disabled={disabled || pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Updating...
        </>
      ) : (
        "Set new password"
      )}
    </Button>
  );
}

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const passwordRules = useMemo(() => getPasswordRuleStates(password), [password]);
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthPercent =
    (passwordStrength.score / passwordStrength.maxScore) * 100;
  const strengthColors: Record<
    ReturnType<typeof getPasswordStrength>["level"],
    { text: string; bar: string }
  > = {
    weak: { text: "text-red-600", bar: "bg-red-500" },
    medium: { text: "text-amber-600", bar: "bg-amber-500" },
    good: { text: "text-sky-600", bar: "bg-sky-500" },
    strong: { text: "text-emerald-600", bar: "bg-emerald-500" },
  };

  const localErrors = useMemo(() => {
    const next: { password?: string; confirmPassword?: string } = {};
    if (!password) {
      next.password = "Password is required.";
    } else {
      const policyError = getFirstPasswordPolicyError(password);
      if (policyError) {
        next.password = policyError;
      }
    }

    if (!confirmPassword) {
      next.confirmPassword = "Please confirm your password.";
    } else if (confirmPassword !== password) {
      next.confirmPassword = "Passwords do not match.";
    }
    return next;
  }, [confirmPassword, password]);

  const getError = (field: "password" | "confirmPassword") => {
    const localError = (touched[field] || submitted) ? localErrors[field] : undefined;
    return localError ?? state.fieldErrors?.[field];
  };
  const hasClientErrors = Object.keys(localErrors).length > 0;

  if (!token.trim()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-10">
        <Card className="w-full max-w-xl border-2 shadow-xl">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl text-destructive">Reset link invalid</CardTitle>
            <CardDescription className="text-base">
              This password reset link is invalid. Request a new link from the sign in page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/portal/forgot-password" className="text-primary hover:underline underline-offset-4">
              Request new reset link
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-10">
      <Card className="w-full max-w-xl border-2 shadow-xl">
        <CardHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-3xl">Set new password</CardTitle>
          <CardDescription className="text-base">
            Enter a new password for your account. This reset link can only be used once.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-base">{state.error}</AlertDescription>
            </Alert>
          )}

          <form
            action={formAction}
            className="space-y-5"
            onSubmit={(event) => {
              setSubmitted(true);
              if (hasClientErrors) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="token" value={token} />

            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-base">
                New password
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  aria-invalid={!!getError("password")}
                  className={cn(
                    "h-11 text-base pr-12",
                    getError("password") && "border-destructive focus-visible:ring-destructive"
                  )}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
              {getError("password") && (
                <p className="text-sm text-destructive">{getError("password")}</p>
              )}
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Password strength
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold",
                    strengthColors[passwordStrength.level].text
                  )}
                >
                  {passwordStrength.label}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    strengthColors[passwordStrength.level].bar
                  )}
                  style={{ width: `${strengthPercent}%` }}
                />
              </div>
              <ul className="mt-2.5 grid gap-1">
                {passwordRules.map((rule) => (
                  <li
                    key={rule.id}
                    className={cn(
                      "flex items-center gap-2 text-xs",
                      rule.met ? "text-emerald-700" : "text-muted-foreground"
                    )}
                  >
                    {rule.met ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                    <span>{rule.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-base">
                Confirm password
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  onBlur={() =>
                    setTouched((prev) => ({ ...prev, confirmPassword: true }))
                  }
                  aria-invalid={!!getError("confirmPassword")}
                  className={cn(
                    "h-11 text-base pr-12",
                    getError("confirmPassword") &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={
                    showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
              {getError("confirmPassword") && (
                <p className="text-sm text-destructive">{getError("confirmPassword")}</p>
              )}
            </div>

            <SubmitButton disabled={hasClientErrors} />
          </form>

          <p className="text-sm text-muted-foreground">
            Back to{" "}
            <Link href="/portal/login" className="text-primary hover:underline underline-offset-4">
              sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
