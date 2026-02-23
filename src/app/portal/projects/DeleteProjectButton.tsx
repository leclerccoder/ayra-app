"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteProjectAction } from "./actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toSafeInternalPath } from "@/lib/inputSecurity";

export default function DeleteProjectButton({
  projectId,
  projectTitle,
  redirectTo,
  className,
  size = "lg",
}: {
  projectId: string;
  projectTitle?: string;
  redirectTo?: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const safeRedirectTo = React.useMemo(
    () => (redirectTo ? toSafeInternalPath(redirectTo, "/portal/projects") : null),
    [redirectTo]
  );

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteProjectAction(projectId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      if (safeRedirectTo) {
        router.push(safeRedirectTo);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        <Trash2 className="mr-2 h-5 w-5" />
        Delete
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setError(null);
          }
        }}
        title="Delete project?"
        description={
          <>
            This will permanently delete{" "}
            <span className="font-semibold text-foreground">
              {projectTitle ?? "this project"}
            </span>{" "}
            and related records.
          </>
        }
        icon={<Trash2 className="h-7 w-7" />}
        confirmLabel="Delete project"
        confirmPendingLabel="Deleting…"
        confirmVariant="destructive"
        pending={pending}
        error={error}
        onConfirm={handleDelete}
      >
        <ul className="list-disc pl-6 space-y-2 text-base text-muted-foreground">
          <li>Removes drafts, disputes, payments, timeline, and chain logs.</li>
          <li>This action cannot be undone.</li>
        </ul>
      </ConfirmDialog>
    </>
  );
}
