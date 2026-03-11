"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { runReviewTimeoutAction, indexChainEventsAction } from "./actions";
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

type ReviewRunProject = {
  projectId: string;
  title: string;
  clientName: string;
  reviewDueAt: string | null;
  txHash?: string;
  reason?: string;
};

type ChainRunProject = {
  projectId: string;
  title: string;
  status: string;
  escrowAddress: string;
  newEventCount: number;
  newEvents: {
    eventName: string;
    txHash: string;
    blockNumber: number | null;
  }[];
  error?: string;
};

type AdminOpsPanelProps = {
  reviewTargets: ReviewTarget[];
  chainTargets: ChainTarget[];
};

const reviewInitialState = {
  error: undefined as string | undefined,
  message: undefined as string | undefined,
  releasedProjects: [] as ReviewRunProject[],
  skippedProjects: [] as ReviewRunProject[],
};

const indexInitialState = {
  error: undefined as string | undefined,
  message: undefined as string | undefined,
  projectResults: [] as ChainRunProject[],
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

export default function AdminOpsPanel({
  reviewTargets,
  chainTargets,
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
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
              Use this when a client has not reviewed the submitted draft before the deadline.
              Running it will automatically release the overdue project instead of waiting for
              a manual admin decision.
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Projects currently in scope</p>
                <p className="text-xs text-muted-foreground">
                  These projects will be released if you run the timeout job now.
                </p>
              </div>
              <Badge variant="secondary">{reviewTargets.length}</Badge>
            </div>
            {reviewTargets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects are currently past due for automatic release.
              </p>
            ) : (
              <div className="space-y-2">
                {reviewTargets.map((project) => (
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
                      Review due: {formatDate(project.reviewDueAt)}
                    </p>
                  </div>
                ))}
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
              {reviewTargets.length > 0 ? ` (${reviewTargets.length})` : ""}
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
                  {reviewState.releasedProjects.map((project) => (
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
                        <Badge>Released</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Review due: {formatDate(project.reviewDueAt)}
                      </p>
                      {project.txHash && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Tx: {compactHash(project.txHash)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {reviewState.skippedProjects.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Skipped
                  </p>
                  {reviewState.skippedProjects.map((project) => (
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
                        <Badge variant="outline">Skipped</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Reason: {project.reason ?? "No reason provided."}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Chain Event Indexer
          </CardTitle>
          <CardDescription>
            Scan every deployed escrow project and pull newly discovered on-chain events into
            the portal timeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-1">
            <p className="text-sm font-semibold">When to use this</p>
            <p className="text-sm text-muted-foreground">
              Use this after blockchain actions such as deposit, release, refund, or dispute
              updates. It pulls those on-chain events into the portal so the timeline and admin
              records stay up to date.
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
    </div>
  );
}
