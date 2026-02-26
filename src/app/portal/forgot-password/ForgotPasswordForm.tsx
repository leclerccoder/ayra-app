"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { requestPasswordResetAction } from "../actions";
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
import { AlertCircle, Loader2, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type FormState = {
  error?: string;
  message?: string;
};

const initialState: FormState = {};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full h-12 text-base" disabled={disabled || pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending...
        </>
      ) : (
        "Send reset link"
      )}
    </Button>
  );
}

export default function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const emailError = useMemo(() => {
    const value = email.trim();
    if (!value) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Enter a valid email address.";
    }
    return "";
  }, [email]);

  const showEmailError = (touched || submitted) && !!emailError;
  const hasError = !!emailError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-10">
      <Card className="w-full max-w-xl border-2 shadow-xl">
        <CardHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <MailCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-3xl">Forgot password</CardTitle>
          <CardDescription className="text-base">
            Enter your account email and we’ll send a secure link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-base">{state.error}</AlertDescription>
            </Alert>
          )}

          {state.message && (
            <Alert className="border-primary/20 bg-primary/5">
              <AlertDescription className="text-base font-medium">
                {state.message}
              </AlertDescription>
            </Alert>
          )}

          <form
            action={formAction}
            className="space-y-5"
            onSubmit={(event) => {
              setSubmitted(true);
              if (hasError) {
                event.preventDefault();
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-base">
                Email
              </Label>
              <Input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={showEmailError}
                className={cn(
                  "h-11 text-base",
                  showEmailError && "border-destructive focus-visible:ring-destructive"
                )}
                required
              />
              {showEmailError && <p className="text-sm text-destructive">{emailError}</p>}
            </div>

            <SubmitButton disabled={hasError} />
          </form>

          <p className="text-sm text-muted-foreground">
            Remembered your password?{" "}
            <Link
              href="/portal/login"
              className="text-primary hover:underline underline-offset-4"
            >
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
