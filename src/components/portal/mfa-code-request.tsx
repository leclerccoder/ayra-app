"use client";

import { useActionState, useEffect } from "react";
import { requestMfaCodeAction } from "@/app/portal/mfa-actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

const initialState = {
  error: undefined as string | undefined,
  message: undefined as string | undefined,
  expiresAt: undefined as string | undefined,
};

function SendCodeButton({ formAction }: { formAction: (formData: FormData) => void }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant="outline"
      formAction={formAction}
      formNoValidate
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          Sending...
        </>
      ) : (
        "Send code"
      )}
    </Button>
  );
}

export function MfaCodeRequest({
  purpose,
  onCodeSent,
}: {
  purpose: string;
  onCodeSent?: () => void;
}) {
  const [state, formAction] = useActionState(requestMfaCodeAction, initialState);

  useEffect(() => {
    if (state.expiresAt) {
      onCodeSent?.();
    }
  }, [onCodeSent, state.expiresAt]);

  return (
    <div className="space-y-2">
      <input type="hidden" name="purpose" value={purpose} />
      <SendCodeButton formAction={formAction} />
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.message && (
        <Alert>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
