"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { acceptAdminInviteAction, type AcceptAdminInviteState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getFirstPasswordPolicyError,
  getPasswordRuleStates,
  getPasswordStrength,
} from "@/lib/passwordPolicy";

const initialState: AcceptAdminInviteState = {};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full h-12 text-base" disabled={disabled || pending}>
      <ShieldCheck className="mr-2 h-4 w-4" />
      {pending ? "Activating..." : "Activate admin account"}
    </Button>
  );
}

export default function AdminInviteForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(acceptAdminInviteAction, initialState);
  const [values, setValues] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    invitationCode: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({
    username: false,
    password: false,
    confirmPassword: false,
    invitationCode: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => {
    const next: Partial<typeof values> = {};
    if (!values.username.trim()) {
      next.username = "Username is required.";
    } else if (values.username.trim().length < 2) {
      next.username = "Username must be at least 2 characters.";
    }

    if (!values.password) {
      next.password = "Password is required.";
    } else {
      const passwordPolicyError = getFirstPasswordPolicyError(values.password);
      if (passwordPolicyError) {
        next.password = passwordPolicyError;
      }
    }

    if (!values.confirmPassword) {
      next.confirmPassword = "Please confirm your password.";
    } else if (values.confirmPassword !== values.password) {
      next.confirmPassword = "Passwords do not match.";
    }

    if (!values.invitationCode.trim()) {
      next.invitationCode = "Invitation code is required.";
    } else if (!/^\d{6}$/.test(values.invitationCode.trim())) {
      next.invitationCode = "Invitation code must be 6 digits.";
    }

    return next;
  }, [values]);

  const passwordRules = useMemo(
    () => getPasswordRuleStates(values.password),
    [values.password]
  );
  const passwordStrength = useMemo(
    () => getPasswordStrength(values.password),
    [values.password]
  );
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

  const getError = (field: keyof typeof values) => {
    const clientError = (touched[field] || submitted) ? errors[field] : undefined;
    return clientError ?? state.fieldErrors?.[field];
  };

  const hasClientErrors = Object.keys(errors).length > 0;
  const onFieldChange = (field: keyof typeof values) => (value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };
  const onFieldBlur = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={(event) => {
        setSubmitted(true);
        if (hasClientErrors) {
          event.preventDefault();
        }
      }}
    >
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <input type="hidden" name="token" value={token} />

      <div className="space-y-2.5">
        <Label htmlFor="invite-username" className="text-base">
          Username
        </Label>
        <Input
          id="invite-username"
          name="username"
          type="text"
          value={values.username}
          onChange={(event) => onFieldChange("username")(event.target.value)}
          onBlur={() => onFieldBlur("username")}
          aria-invalid={!!getError("username")}
          aria-describedby={getError("username") ? "invite-username-error" : undefined}
          className={cn(
            "h-11 text-base",
            getError("username") && "border-destructive focus-visible:ring-destructive"
          )}
          required
        />
        {getError("username") && (
          <p id="invite-username-error" className="text-sm text-destructive">
            {getError("username")}
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="invite-password" className="text-base">
          Create password
        </Label>
        <div className="relative">
          <Input
            id="invite-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={values.password}
            onChange={(event) => onFieldChange("password")(event.target.value)}
            onBlur={() => onFieldBlur("password")}
            aria-invalid={!!getError("password")}
            aria-describedby={getError("password") ? "invite-password-error" : undefined}
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
          <p id="invite-password-error" className="text-sm text-destructive">
            {getError("password")}
          </p>
        )}
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
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="invite-confirm" className="text-base">
          Confirm password
        </Label>
        <div className="relative">
          <Input
            id="invite-confirm"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={(event) => onFieldChange("confirmPassword")(event.target.value)}
            onBlur={() => onFieldBlur("confirmPassword")}
            aria-invalid={!!getError("confirmPassword")}
            aria-describedby={getError("confirmPassword") ? "invite-confirm-error" : undefined}
            className={cn(
              "h-11 text-base pr-12",
              getError("confirmPassword") && "border-destructive focus-visible:ring-destructive"
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
          <p id="invite-confirm-error" className="text-sm text-destructive">
            {getError("confirmPassword")}
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        <Label htmlFor="invite-code" className="text-base">
          Invitation code
        </Label>
        <Input
          id="invite-code"
          name="invitationCode"
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          placeholder="6-digit code from email"
          value={values.invitationCode}
          onChange={(event) => onFieldChange("invitationCode")(event.target.value.replace(/\D/g, ""))}
          onBlur={() => onFieldBlur("invitationCode")}
          aria-invalid={!!getError("invitationCode")}
          aria-describedby={getError("invitationCode") ? "invite-code-error" : undefined}
          className={cn(
            "h-11 text-base tracking-[0.3em] font-medium",
            getError("invitationCode") && "border-destructive focus-visible:ring-destructive"
          )}
          required
        />
        {getError("invitationCode") && (
          <p id="invite-code-error" className="text-sm text-destructive">
            {getError("invitationCode")}
          </p>
        )}
      </div>

      <SubmitButton disabled={hasClientErrors} />
    </form>
  );
}
