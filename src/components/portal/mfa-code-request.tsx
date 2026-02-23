"use client";

import { useActionState } from "react";
import { requestMfaCodeAction } from "@/app/portal/mfa-actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState = { error: undefined as string | undefined, message: undefined as string | undefined };

export function MfaCodeRequest({ purpose }: { purpose: string }) {
  const [state, formAction] = useActionState(requestMfaCodeAction, initialState);

  return (
    <div className="space-y-2">
      <input type="hidden" name="purpose" value={purpose} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        formAction={formAction}
        formNoValidate
      >
        Send code
      </Button>
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
