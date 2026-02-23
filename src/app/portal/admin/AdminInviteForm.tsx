"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { inviteAdminAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Briefcase, Loader2, MailPlus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type FormState = { error?: string; message?: string };

const initialState: FormState = { error: undefined, message: undefined };

export default function AdminInviteForm() {
  const [state, formAction] = useActionState(inviteAdminAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.message) {
      router.refresh();
    }
  }, [state.message, router]);

  return (
    <AdminInviteFormInner
      key={state.message ?? "invite-form"}
      state={state}
      formAction={formAction}
    />
  );
}

function AdminInviteFormInner(props: {
  state: FormState;
  formAction: (formData: FormData) => void;
}) {
  const { state, formAction } = props;
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "DESIGNER">("ADMIN");
  const [touched, setTouched] = useState(false);

  const emailError = useMemo(() => {
    const value = email.trim();
    if (!value) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Enter a valid email address.";
    }
    return "";
  }, [email]);

  const showError = touched && !!emailError;
  const canSubmit = !emailError;

  return (
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={(event) => {
        setTouched(true);
        if (emailError) {
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
      {state.message && (
        <Alert>
          <AlertDescription className="text-lg font-semibold">
            {state.message}
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label className="text-base">Invite role</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setRole("ADMIN")}
            className={cn(
              "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors",
              role === "ADMIN"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
            aria-pressed={role === "ADMIN"}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              role === "ADMIN" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold">Admin</div>
              <div className="text-sm text-muted-foreground">Console access</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setRole("DESIGNER")}
            className={cn(
              "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors",
              role === "DESIGNER"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
            aria-pressed={role === "DESIGNER"}
          >
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              role === "DESIGNER" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold">Designer</div>
              <div className="text-sm text-muted-foreground">Design workspace access</div>
            </div>
          </button>
        </div>
        <input type="hidden" name="role" value={role} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="invite-email">
          Invite {role === "ADMIN" ? "admin" : "designer"} by email
        </Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="invite-email"
            name="email"
            type="email"
            placeholder="admin@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={showError}
            aria-describedby={showError ? "invite-email-error" : undefined}
            className={cn(
              "flex-1 h-14 text-lg px-5",
              showError && "border-destructive focus-visible:ring-destructive"
            )}
            required
          />
          <SubmitInviteButton disabled={!canSubmit} />
        </div>
        {showError && (
          <p id="invite-email-error" className="text-base text-destructive">
            {emailError}
          </p>
        )}
        <p className="text-base text-muted-foreground">
          Invitations expire after 7 days. The recipient will set their own
          credentials and invitation code after accepting the link.
        </p>
      </div>
    </form>
  );
}

function SubmitInviteButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      disabled={disabled || pending}
      className="sm:min-w-[220px]"
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Sending invite...
        </>
      ) : (
        <>
          <MailPlus className="mr-2 h-4 w-4" />
          Send invite
        </>
      )}
    </Button>
  );
}
