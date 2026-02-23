"use client";

import { useActionState } from "react";
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
import { Activity, Clock, Database } from "lucide-react";
import { MfaCodeRequest } from "@/components/portal/mfa-code-request";

const initialState = { error: undefined as string | undefined, message: undefined as string | undefined };

export default function AdminOpsPanel() {
  const [reviewState, reviewAction] = useActionState(runReviewTimeoutAction, initialState);
  const [indexState, indexAction] = useActionState(indexChainEventsAction, initialState);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Review Timeout Automation
          </CardTitle>
          <CardDescription>
            Release escrow automatically when the review window expires.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
                <MfaCodeRequest purpose="review_timeout" />
              </div>
              <Input id="review-mfa" name="mfaCode" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              <Activity className="mr-2 h-4 w-4" />
              Run review timeout job
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Chain Event Indexer
          </CardTitle>
          <CardDescription>
            Pull the latest on-chain events into the portal timeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
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
                <MfaCodeRequest purpose="index_chain_events" />
              </div>
              <Input id="index-mfa" name="mfaCode" type="password" required />
            </div>
            <Button type="submit" className="w-full" variant="outline">
              <Database className="mr-2 h-4 w-4" />
              Index chain events
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
