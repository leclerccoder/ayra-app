"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  confirmLabel = "Confirm",
  confirmPendingLabel,
  cancelLabel = "Cancel",
  confirmVariant = "destructive",
  onConfirm,
  pending = false,
  error,
  contentClassName,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  confirmLabel?: string;
  confirmPendingLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonProps["variant"];
  onConfirm: () => void;
  pending?: boolean;
  error?: string | null;
  contentClassName?: string;
  children?: React.ReactNode;
}) {
  const isDestructive = confirmVariant === "destructive";
  const headerTone = isDestructive
    ? "border-destructive/20 bg-destructive/5"
    : "border-primary/20 bg-primary/5";
  const iconTone = isDestructive
    ? "bg-destructive/10 text-destructive"
    : "bg-primary/10 text-primary";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-xl p-10", contentClassName)}>
        <DialogHeader className="space-y-6">
          <div className={cn("rounded-2xl border p-6", headerTone)}>
            <div className="flex items-start gap-5">
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl",
                  iconTone
                )}
              >
                {icon ?? <AlertTriangle className="h-7 w-7" />}
              </div>
              <div className="flex-1 space-y-2">
                <DialogTitle className="text-3xl">{title}</DialogTitle>
                {description ? (
                  <DialogDescription className="text-lg leading-relaxed">
                    {description}
                  </DialogDescription>
                ) : null}
              </div>
            </div>
          </div>
        </DialogHeader>

        {children ? <div className="mt-6 space-y-4">{children}</div> : null}

        {error ? (
          <div className="mt-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : null}

        <DialogFooter className="mt-8">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            size="lg"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? confirmPendingLabel ?? confirmLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

