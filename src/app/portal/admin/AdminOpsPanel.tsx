"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  runReviewTimeoutAction,
  indexChainEventsAction,
  type ChainIndexActionState,
  type ReviewTimeoutActionState,
} from "./actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, Database } from "lucide-react";
import { MfaCodeRequest } from "@/components/portal/mfa-code-request";
import { formatPortalDate } from "@/lib/dateFormat";
import { cn } from "@/lib/utils";

type ReviewTarget = {
  projectId: string;
  title: string;
  status: string;
  clientName: string;
  reviewDueAt: string | null;
};

type ChainTarget = {
  projectId: string;
  title: string;
  status: string;
  clientName: string;
  escrowAddress: string;
  indexedEvents: number;
};

type AdminOpsPanelProps = {
  reviewTargets: ReviewTarget[];
  chainTargets: ChainTarget[];
  showReviewTimeout?: boolean;
  showChainIndexer?: boolean;
};

const reviewInitialState: ReviewTimeoutActionState = {
  error: undefined as string | undefined,
  message: undefined as string | undefined,
  releasedProjects: [],
  skippedProjects: [],
};

const indexInitialState: ChainIndexActionState = {
  error: undefined as string | undefined,
  message: undefined as string | undefined,
  projectResults: [],
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  return formatPortalDate(value, {
    fallback: "Not scheduled",
    includeTime: true,
    day: "numeric",
  });
}

function compactHash(hash: string) {
  if (hash.length <= 18) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function getReviewDeadlineState(reviewDueAt: string | null, referenceTimeMs: number) {
  if (!reviewDueAt) {
    return {
      label: "Not scheduled",
      badgeClassName: "border-border bg-background text-muted-foreground",
      dateClassName: "text-muted-foreground",
      detail: "No review date has been set yet.",
    };
  }

  const dueDate = new Date(reviewDueAt);
  if (Number.isNaN(dueDate.getTime())) {
    return {
      label: "Unknown",
      badgeClassName: "border-border bg-background text-muted-foreground",
      dateClassName: "text-muted-foreground",
      detail: "Review date could not be parsed.",
    };
  }

  const diffMs = dueDate.getTime() - referenceTimeMs;
  const diffHours = Math.round(Math.abs(diffMs) / (1000 * 60 * 60));

  if (diffMs < 0) {
    return {
      label: "Overdue",
      badgeClassName: "border-destructive/30 bg-destructive/10 text-destructive",
      dateClassName: "font-semibold text-destructive",
      detail:
        diffHours < 24
          ? `Overdue by ${Math.max(diffHours, 1)} hour${Math.max(diffHours, 1) === 1 ? "" : "s"}.`
          : `Overdue by ${Math.max(Math.round(diffHours / 24), 1)} day${Math.max(Math.round(diffHours / 24), 1) === 1 ? "" : "s"}.`,
    };
  }

  if (diffMs <= 24 * 60 * 60 * 1000) {
    return {
      label: "Due soon",
      badgeClassName: "border-amber-300 bg-amber-50 text-amber-700",
      dateClassName: "font-semibold text-amber-700",
      detail: `Due within ${Math.max(diffHours, 1)} hour${Math.max(diffHours, 1) === 1 ? "" : "s"}.`,
    };
  }

  return {
    label: "Upcoming",
    badgeClassName: "border-emerald-300 bg-emerald-50 text-emerald-700",
    dateClassName: "font-semibold text-emerald-700",
    detail: "Review deadline is still within the active window.",
  };
}

export default function AdminOpsPanel({
  reviewTargets,
  chainTargets,
  showReviewTimeout = true,
  showChainIndexer = true,
}: AdminOpsPanelProps) {
  const [reviewState, reviewAction] = useActionState(
    runReviewTimeoutAction,
    reviewInitialState
  );
  const [indexState, indexAction] = useActionState(
    indexChainEventsAction,
    indexInitialState
  );
  const [isReviewMfaReady, setIsReviewMfaReady] = useState(false);
  const [isIndexMfaReady, setIsIndexMfaReady] = useState(false);
  const [referenceTimeMs] = useState(() => Date.now());
  const overdueReviewCount = reviewTargets.filter((project) => {
    if (!project.reviewDueAt) {
      return false;
    }
    const dueDate = new Date(project.reviewDueAt);
    return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < referenceTimeMs;
  }).length;

  return (
    <div className={cn("grid gap-6", showReviewTimeout && showChainIndexer && "lg:grid-cols-2")}>
      {showReviewTimeout ? (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Review Timeout Automation
          </CardTitle>
          <CardDescription>
            Release escrow automatically for draft-submitted projects whose review window has
            already expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-1">
            <p className="text-sm font-semibold">When to use this</p>
            <p className="text-sm text-muted-foreground">
              Use this to monitor draft review deadlines. Projects marked overdue will be
              released if you run the timeout job, while upcoming ones are still within the
              client review window.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Projects currently in scope</p>
                <p className="text-xs text-muted-foreground">
                  These draft-submitted projects have active review deadlines. Only the overdue
                  ones will be released if you run the timeout job now.
                </p>
              </div>
              <Badge variant="secondary">{overdueReviewCount} overdue</Badge>
            </div>
            {reviewTargets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects currently have a review deadline.
              </p>
            ) : (
              <div className="space-y-2">
                {reviewTargets.map((project) => {
                  const deadlineState = getReviewDeadlineState(
                    project.reviewDueAt,
                    referenceTimeMs
                  );

                  return (
                    <div key={project.projectId} className="rounded-lg border bg-background p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <Link
                            href={`/portal/projects/${project.projectId}`}
                            className="font-semibold leading-none hover:underline"
                          >
                            {project.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            Client: {project.clientName}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Badge
                            variant="outline"
                            className={cn("border", deadlineState.badgeClassName)}
                          >
                            {deadlineState.label}
                          </Badge>
                          <Badge variant="outline">{formatStatus(project.status)}</Badge>
                        </div>
                      </div>
                      <p className={cn("mt-2 text-xs", deadlineState.dateClassName)}>
                        Review due: {formatDate(project.reviewDueAt)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {deadlineState.detail}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {reviewState.error && (
            <Alert variant="destructive">
              <AlertDescription>{reviewState.error}</AlertDescription>
            </Alert>
          )}
          {reviewState.message && (
            <Alert>
              <AlertDescription>{reviewState.message}</AlertDescription>
            </Alert>
          )}
          <form action={reviewAction} className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="review-mfa">Admin email code</Label>
                <MfaCodeRequest
                  purpose="review_timeout"
                  onCodeSent={() => setIsReviewMfaReady(true)}
                />
              </div>
              <Input
                id="review-mfa"
                name="mfaCode"
                type="password"
                placeholder={isReviewMfaReady ? "Enter email code" : "Click Send code first"}
                required={isReviewMfaReady}
                disabled={!isReviewMfaReady}
              />
              {!isReviewMfaReady && (
                <p className="text-xs text-muted-foreground">
                  Send a code first to unlock this field.
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={!isReviewMfaReady}>
              <Activity className="mr-2 h-4 w-4" />
              Run review timeout job
              {overdueReviewCount > 0 ? ` (${overdueReviewCount})` : ""}
            </Button>
          </form>
          {(reviewState.releasedProjects.length > 0 ||
            reviewState.skippedProjects.length > 0) && (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold">Latest run details</p>
                <p className="text-xs text-muted-foreground">
                  Exact projects affected by the most recent timeout run.
                </p>
              </div>
              {reviewState.releasedProjects.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Released
                  </p>
                  {reviewState.releasedProjects.map((project) => {
                    const deadlineState = getReviewDeadlineState(
                      project.reviewDueAt,
                      referenceTimeMs
                    );

                    return (
                      <div key={project.projectId} className="rounded-lg border bg-background p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <Link
                              href={`/portal/projects/${project.projectId}`}
                              className="font-semibold leading-none hover:underline"
                            >
                              {project.title}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              Client: {project.clientName}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Badge
                              variant="outline"
                              className={cn("border", deadlineState.badgeClassName)}
                            >
                              {deadlineState.label}
                            </Badge>
                            <Badge>Released</Badge>
                          </div>
                        </div>
                        <p className={cn("mt-2 text-xs", deadlineState.dateClassName)}>
                          Review due: {formatDate(project.reviewDueAt)}
                        </p>
                        {project.txHash && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Tx: {compactHash(project.txHash)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {reviewState.skippedProjects.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Skipped
                  </p>
                  {reviewState.skippedProjects.map((project) => {
                    const deadlineState = getReviewDeadlineState(
                      project.reviewDueAt,
                      referenceTimeMs
                    );

                    return (
                      <div key={project.projectId} className="rounded-lg border bg-background p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <Link
                              href={`/portal/projects/${project.projectId}`}
                              className="font-semibold leading-none hover:underline"
                            >
                              {project.title}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              Client: {project.clientName}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Badge
                              variant="outline"
                              className={cn("border", deadlineState.badgeClassName)}
                            >
                              {deadlineState.label}
                            </Badge>
                            <Badge variant="outline">Skipped</Badge>
                          </div>
                        </div>
                        <p className={cn("mt-2 text-xs", deadlineState.dateClassName)}>
                          Review due: {formatDate(project.reviewDueAt)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Reason: {project.reason ?? "No reason provided."}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      ) : null}

      {showChainIndexer ? (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Chain Event Indexer
          </CardTitle>
          <CardDescription>
            Manual resync tool for deployed escrow projects. Normal portal actions already
            store their own chain updates, but this backfills anything the portal missed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-1">
            <p className="text-sm font-semibold">When to use this</p>
            <p className="text-sm text-muted-foreground">
              Use this if a blockchain transaction happened outside the portal, the app was
              offline during an update, or you want to reconcile the timeline after a restart.
              It scans the contract and inserts any missing events that were not written at
              action time.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Projects currently in scope</p>
                <p className="text-xs text-muted-foreground">
                  These deployed escrow projects will be scanned when you run the indexer.
                </p>
              </div>
              <Badge variant="secondary">{chainTargets.length}</Badge>
            </div>
            {chainTargets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No deployed escrow projects are available for indexing yet.
              </p>
            ) : (
              <div className="space-y-2">
                {chainTargets.map((project) => (
                  <div key={project.projectId} className="rounded-lg border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <Link
                          href={`/portal/projects/${project.projectId}`}
                          className="font-semibold leading-none hover:underline"
                        >
                          {project.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Client: {project.clientName}
                        </p>
                      </div>
                      <Badge variant="outline">{formatStatus(project.status)}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Escrow: {compactHash(project.escrowAddress)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Indexed events already stored: {project.indexedEvents}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {indexState.error && (
            <Alert variant="destructive">
              <AlertDescription>{indexState.error}</AlertDescription>
            </Alert>
          )}
          {indexState.message && (
            <Alert>
              <AlertDescription>{indexState.message}</AlertDescription>
            </Alert>
          )}
          <form action={indexAction} className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="index-mfa">Admin email code</Label>
                <MfaCodeRequest
                  purpose="index_chain_events"
                  onCodeSent={() => setIsIndexMfaReady(true)}
                />
              </div>
              <Input
                id="index-mfa"
                name="mfaCode"
                type="password"
                placeholder={isIndexMfaReady ? "Enter email code" : "Click Send code first"}
                required={isIndexMfaReady}
                disabled={!isIndexMfaReady}
              />
              {!isIndexMfaReady && (
                <p className="text-xs text-muted-foreground">
                  Send a code first to unlock this field.
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              variant="outline"
              disabled={!isIndexMfaReady}
            >
              <Database className="mr-2 h-4 w-4" />
              Index chain events
              {chainTargets.length > 0 ? ` (${chainTargets.length})` : ""}
            </Button>
          </form>
          {indexState.projectResults.length > 0 && (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold">Latest run details</p>
                <p className="text-xs text-muted-foreground">
                  Per-project indexing results from the most recent chain scan.
                </p>
              </div>
              <div className="space-y-2">
                {indexState.projectResults.map((project) => (
                  <div key={project.projectId} className="rounded-lg border bg-background p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <Link
                          href={`/portal/projects/${project.projectId}`}
                          className="font-semibold leading-none hover:underline"
                        >
                          {project.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Escrow: {compactHash(project.escrowAddress)}
                        </p>
                      </div>
                      <Badge variant={project.error ? "destructive" : "outline"}>
                        {project.error
                          ? "Error"
                          : project.newEventCount > 0
                            ? `+${project.newEventCount} event${project.newEventCount === 1 ? "" : "s"}`
                            : "No changes"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Status: {formatStatus(project.status)}
                    </p>
                    {project.error ? (
                      <p className="mt-1 text-xs text-destructive">{project.error}</p>
                    ) : project.newEvents.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {project.newEvents.map((event) => (
                          <p key={`${project.projectId}-${event.txHash}-${event.eventName}`} className="text-xs text-muted-foreground">
                            {event.eventName} · {compactHash(event.txHash)}
                            {event.blockNumber ? ` · block ${event.blockNumber}` : ""}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        No new on-chain events were found for this project.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}
