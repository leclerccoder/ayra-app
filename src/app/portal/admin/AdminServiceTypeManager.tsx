"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { addServiceTypeAction, deleteServiceTypeAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { formatPortalDate } from "@/lib/dateFormat";

type FormState = {
  error?: string;
  message?: string;
};

type ServiceTypeRow = {
  id: string;
  name: string;
  createdAt: string;
};

const initialState: FormState = {};

function AddButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending} className="sm:min-w-[180px]">
      <Plus className="mr-2 h-4 w-4" />
      Add service type
    </Button>
  );
}

export default function AdminServiceTypeManager({
  serviceTypes,
}: {
  serviceTypes: ServiceTypeRow[];
}) {
  const [state, formAction] = useActionState(addServiceTypeAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.message) {
      router.refresh();
    }
  }, [router, state.message]);

  return (
    <AdminServiceTypeManagerInner
      key={state.message ?? "service-type-manager"}
      serviceTypes={serviceTypes}
      state={state}
      formAction={formAction}
    />
  );
}

function AdminServiceTypeManagerInner({
  serviceTypes,
  state,
  formAction,
}: {
  serviceTypes: ServiceTypeRow[];
  state: FormState;
  formAction: (formData: FormData) => void;
}) {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const router = useRouter();

  const nameError =
    !name.trim()
      ? "Service type is required."
      : name.trim().length < 2
      ? "Service type must be at least 2 characters."
      : "";

  return (
    <div className="space-y-5">
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
      {actionError && (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <form
        action={formAction}
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          setTouched(true);
          setActionError(null);
          if (nameError) {
            event.preventDefault();
          }
        }}
      >
        <div className="flex-1 space-y-2">
          <Input
            name="name"
            type="text"
            placeholder="Add a new service type, e.g. 4D Design"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && !!nameError}
          />
          {touched && nameError && <p className="text-sm text-destructive">{nameError}</p>}
        </div>
        <AddButton disabled={!!nameError} />
      </form>

      <div className="space-y-3">
        {serviceTypes.map((serviceType) => (
          <div
            key={serviceType.id}
            className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{serviceType.name}</span>
                <Badge variant="outline">
                  Added {formatPortalDate(serviceType.createdAt, { fallback: "—" })}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Used in the portal enquiry service selection.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="sm:min-w-[150px]"
              disabled={isDeleting}
              onClick={() => {
                setActionError(null);
                startDeleteTransition(async () => {
                  const result = await deleteServiceTypeAction(serviceType.id);
                  if (result.error) {
                    setActionError(result.error);
                    return;
                  }
                  router.refresh();
                });
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
