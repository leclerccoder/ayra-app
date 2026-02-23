"use client";

import * as React from "react";
import { CheckCircle2, CreditCard, Landmark, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type StoredReceipt = {
  projectId: string;
  projectTitle?: string;
  createdAt: string;
  purpose?: string;
  method?: string;
  reference?: string;
  amount?: string;
  bankName?: string;
  cardLast4?: string;
};

function friendlyPurpose(value: string | undefined) {
  if (value === "BALANCE") return "Balance payment";
  if (value === "DEPOSIT") return "Deposit payment";
  return "Payment";
}

export default function PaymentSuccessBanner({ projectId }: { projectId: string }) {
  const [receipt, setReceipt] = React.useState<StoredReceipt | null>(null);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`ayra:payment-receipt:${projectId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredReceipt;
      setReceipt(parsed);
      sessionStorage.removeItem(`ayra:payment-receipt:${projectId}`);
    } catch {
      // ignore
    }
  }, [projectId]);

  React.useEffect(() => {
    if (!receipt) return;
    const timer = window.setTimeout(() => setReceipt(null), 12_000);
    return () => window.clearTimeout(timer);
  }, [receipt]);

  if (!receipt) return null;

  const isFpx = receipt.method?.toUpperCase() === "FPX";

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-background to-primary/5 p-6 shadow-sm"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-semibold text-foreground">
              Payment successful
            </div>
            <div className="text-base text-muted-foreground">
              {friendlyPurpose(receipt.purpose)} recorded for{" "}
              <span className="font-semibold text-foreground">
                {receipt.projectTitle ?? "this project"}
              </span>
              .
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 self-end sm:self-start"
          onClick={() => setReceipt(null)}
          aria-label="Dismiss payment success"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-background/60 p-4">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Amount
          </div>
          <div className="mt-1 text-xl font-semibold text-foreground">
            RM {receipt.amount ?? "—"}
          </div>
        </div>

        <div className="rounded-xl border bg-background/60 p-4">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Reference
          </div>
          <div className="mt-1 text-base font-mono text-foreground truncate">
            {receipt.reference ?? "—"}
          </div>
        </div>

        <div className="rounded-xl border bg-background/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {isFpx ? <Landmark className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
            Method
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {receipt.method ?? "—"}
          </div>
          {receipt.bankName ? (
            <div className="mt-1 text-base text-muted-foreground">
              {receipt.bankName}
            </div>
          ) : null}
          {receipt.cardLast4 ? (
            <div className="mt-1 text-base text-muted-foreground">
              **** {receipt.cardLast4}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border bg-background/60 p-4">
          <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Time
          </div>
          <div className="mt-1 text-base text-foreground">
            {new Date(receipt.createdAt).toLocaleString("en-MY", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

