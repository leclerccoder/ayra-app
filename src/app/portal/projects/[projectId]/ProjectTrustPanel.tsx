import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Link2,
  LockKeyhole,
  Scale,
  ShieldCheck,
  UserCog,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ProjectTrustPanelProps = {
  userRole: "ADMIN" | "CLIENT" | "DESIGNER";
  status: string;
  escrowAddress: string | null;
  chainId: number | null;
  escrowPaused: boolean;
  timeline: Array<{ eventType: string; txHash: string | null }>;
  chainEvents: Array<{ eventName: string; txHash: string }>;
  drafts: Array<{ sha256: string }>;
  disputes: Array<{ status: string }>;
  payments: Array<{ type: string; status: string; txHash: string | null }>;
};

function shortHash(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function isFinalStatus(status: string) {
  return ["RELEASED", "REFUNDED", "RESOLVED", "CANCELLED"].includes(status);
}

export default function ProjectTrustPanel({
  userRole,
  status,
  escrowAddress,
  chainId,
  escrowPaused,
  timeline,
  chainEvents,
  drafts,
  disputes,
  payments,
}: ProjectTrustPanelProps) {
  const depositPaid = payments.some(
    (payment) => payment.type === "DEPOSIT" && payment.status === "COMPLETED"
  );
  const balancePaid = payments.some(
    (payment) => payment.type === "BALANCE" && payment.status === "COMPLETED"
  );
  const hasDraftProof = drafts.some((draft) => Boolean(draft.sha256));
  const integrityCoverage = drafts.length
    ? Math.round((drafts.filter((draft) => Boolean(draft.sha256)).length / drafts.length) * 100)
    : 100;

  const settlementComplete = ["RELEASED", "REFUNDED", "RESOLVED"].includes(status);
  const hasOpenDispute = disputes.some((dispute) => dispute.status === "OPEN");
  const timelineHasDraft = timeline.some((event) => event.eventType === "DRAFT_SUBMITTED");

  const txProofs = Array.from(
    new Set(
      [
        ...chainEvents.map((event) => event.txHash),
        ...payments.map((payment) => payment.txHash ?? ""),
        ...timeline.map((event) => event.txHash ?? ""),
      ].filter(Boolean)
    )
  );

  const signalStates = {
    contract: Boolean(escrowAddress),
    proofs: txProofs.length > 0,
    integrity: integrityCoverage === 100,
    roles: true,
    dispute: true,
    paused: !escrowPaused,
  };

  const securitySignals = [
    {
      label: "Escrow contract",
      value: escrowAddress ? "Deployed and linked" : "Pending deployment",
      ok: signalStates.contract,
      icon: ShieldCheck,
    },
    {
      label: "On-chain proofs",
      value: `${txProofs.length} immutable tx hash${txProofs.length === 1 ? "" : "es"}`,
      ok: signalStates.proofs,
      icon: Link2,
    },
    {
      label: "File integrity",
      value: `${integrityCoverage}% SHA-256 coverage`,
      ok: signalStates.integrity,
      icon: FileCheck2,
    },
    {
      label: "Role-based controls",
      value: "Client, designer, admin actions separated",
      ok: signalStates.roles,
      icon: UserCog,
    },
    {
      label: "Dispute fallback",
      value: hasOpenDispute ? "Arbitration active" : "Arbitration ready",
      ok: signalStates.dispute,
      icon: Scale,
    },
    {
      label: "Escrow execution lock",
      value: escrowPaused ? "Paused by admin control" : "Execution enabled",
      ok: signalStates.paused,
      icon: LockKeyhole,
    },
  ] as const;

  const securityScore = Math.round(
    (securitySignals.filter((signal) => signal.ok).length / securitySignals.length) * 100
  );
  const securityScoreTone =
    securityScore >= 85
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : securityScore >= 70
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-destructive/30 bg-destructive/10 text-destructive";
  const scoreLabel =
    securityScore >= 85 ? "High confidence" : securityScore >= 70 ? "Moderate confidence" : "Needs attention";

  const flowSteps = [
    { id: "deploy", label: "Contract deployed", done: Boolean(escrowAddress) },
    { id: "deposit", label: "Deposit committed", done: depositPaid },
    { id: "draft", label: "Draft hash recorded", done: hasDraftProof || timelineHasDraft },
    { id: "balance", label: "Approval + balance", done: balancePaid || status === "APPROVED" },
    { id: "settle", label: "Settlement complete", done: settlementComplete },
  ];

  const currentStepIndex = flowSteps.findIndex((step) => !step.done);

  const roleActions = [
    {
      role: "CLIENT",
      actions: [
        !escrowPaused && status === "DRAFT" ? "Fund deposit" : null,
        !escrowPaused && status === "DRAFT_SUBMITTED" ? "Approve draft + pay balance" : null,
        ["DRAFT_SUBMITTED", "APPROVED"].includes(status) ? "Open dispute" : null,
      ].filter((action): action is string => Boolean(action)),
    },
    {
      role: "DESIGNER",
      actions: [!isFinalStatus(status) ? "Upload draft deliverable" : null].filter(
        (action): action is string => Boolean(action)
      ),
    },
    {
      role: "ADMIN",
      actions: [
        escrowAddress && escrowPaused ? "Resume escrow" : null,
        escrowAddress && !escrowPaused ? "Pause escrow" : null,
        !escrowPaused && status === "APPROVED" ? "Release funds" : null,
        !escrowPaused && !isFinalStatus(status) ? "Issue refund" : null,
        hasOpenDispute ? "Arbitrate dispute" : null,
      ].filter((action): action is string => Boolean(action)),
    },
  ] as const;

  return (
    <Card className="border shadow-lg">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Activity className="h-5 w-5 text-primary" />
              Smart Contract Security Monitor
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              ESCROW VERIFICATION
            </Badge>
            {chainId ? (
              <Badge variant="secondary" className="font-mono text-xs">
                Chain {chainId}
              </Badge>
            ) : null}
          </div>
          <div className={cn("rounded-lg border px-3 py-2 text-right", securityScoreTone)}>
            <p className="text-[11px] uppercase tracking-wide">Security score</p>
            <p className="text-lg font-semibold">{securityScore}%</p>
            <p className="text-[11px]">{scoreLabel}</p>
          </div>
        </div>
        <CardDescription className="text-sm">
          Live verification of escrow behavior, transaction proofs, and role-gated operations
          for admin, client, and designer.
        </CardDescription>

        <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 md:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Contract address</p>
            <p className="mt-0.5 font-mono text-xs text-foreground">
              {escrowAddress ? shortHash(escrowAddress) : "Not deployed"}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Project state</p>
            <p className="mt-0.5 text-xs font-medium text-foreground">{status}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Proof records</p>
            <p className="mt-0.5 text-xs font-medium text-foreground">
              {txProofs.length} tx + {drafts.length} draft hash
              {drafts.length === 1 ? "" : "es"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {securitySignals.map((signal) => (
            <div
              key={signal.label}
              className={cn(
                "rounded-lg border p-3",
                signal.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
              )}
            >
              <div className="flex items-center gap-2">
                <signal.icon className="h-4 w-4 text-foreground/80" />
                <p className="text-sm font-medium text-foreground">{signal.label}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{signal.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Contract lifecycle</p>
            <div className="space-y-2.5">
              {flowSteps.map((step, index) => {
                const active = index === currentStepIndex;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                      step.done
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : active
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-background"
                    )}
                  >
                    {step.done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : active ? (
                      <Clock3 className="h-4 w-4 text-primary" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Transaction proof hashes</p>
            {txProofs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transaction hash recorded yet. Hash proofs appear after deposit/funding events.
              </p>
            ) : (
              <div className="space-y-2">
                {txProofs.slice(0, 5).map((txHash) => (
                  <div
                    key={txHash}
                    className="rounded-md border bg-background px-3 py-2 font-mono text-xs text-muted-foreground"
                    title={txHash}
                  >
                    {shortHash(txHash)}
                  </div>
                ))}
                {txProofs.length > 5 ? (
                  <p className="text-xs text-muted-foreground">
                    +{txProofs.length - 5} more hash proof
                    {txProofs.length - 5 === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {roleActions.map((entry) => {
            const isCurrentRole = userRole === entry.role;
            return (
              <div
                key={entry.role}
                className={cn(
                  "rounded-lg border p-3",
                  isCurrentRole ? "border-primary/40 bg-primary/5" : "bg-background"
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{entry.role}</p>
                  {isCurrentRole ? <Badge variant="secondary">Your role</Badge> : null}
                </div>
                {entry.actions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No immediate action available.</p>
                ) : (
                  <ul className="space-y-1">
                    {entry.actions.map((action) => (
                      <li key={action} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Wallet className="h-3.5 w-3.5" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
