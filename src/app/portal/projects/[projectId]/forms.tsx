"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  approveDraftAction,
  arbitrateDisputeAction,
  fundDepositAction,
  openDisputeAction,
  pauseEscrowAction,
  postDraftCommentAction,
  refundFundsAction,
  resumeEscrowAction,
  releaseFundsAction,
  uploadDraftAction,
  verifyDraftAction,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MfaCodeRequest } from "@/components/portal/mfa-code-request";
import {
  AlertCircle,
  CheckCircle,
  Upload,
  DollarSign,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  Gavel,
  Pause,
  Play,
  CloudUpload,
  File,
  Loader2,
  MessageSquareText,
  SendHorizonal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const initialState = {
  error: undefined as string | undefined,
  message: undefined as string | undefined,
};
const verifyInitialState = {
  error: undefined as string | undefined,
  result: undefined as "MATCH" | "MISMATCH" | undefined,
};
const draftCommentInitialState = {
  error: undefined as string | undefined,
  message: undefined as string | undefined,
  comment: undefined as
    | {
        id: string;
        message: string;
        createdAt: string;
        author: {
          id: string;
          name: string;
          role: string;
        };
      }
    | undefined,
};

type DraftDiscussionComment = {
  id: string;
  message: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: string;
  };
};

// Loading Button Component
function LoadingButton({
  children,
  loadingText = "Processing...",
  variant = "default",
  size = "lg",
  className = "",
  type = "submit",
  disabled = false,
}: {
  children: React.ReactNode;
  loadingText?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  type?: "submit" | "button";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type={type}
      disabled={pending || disabled}
      variant={variant}
      size={size}
      className={`h-12 text-base px-6 ${className}`}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

function AdminMfaField({
  id,
  purpose,
  isReady,
  onCodeSent,
}: {
  id: string;
  purpose: string;
  isReady: boolean;
  onCodeSent: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={id} className="text-base font-medium">Admin email code</Label>
        <MfaCodeRequest purpose={purpose} onCodeSent={onCodeSent} />
      </div>
      <Input
        id={id}
        name="mfaCode"
        type="password"
        placeholder={isReady ? "Enter email code" : "Click Send code first"}
        required={isReady}
        disabled={!isReady}
        className="h-12 text-base"
      />
      {!isReady && (
        <p className="text-xs text-muted-foreground">
          Send a code first to unlock this field.
        </p>
      )}
    </div>
  );
}

export function DepositForm({
  projectId,
  paymentMode,
}: {
  projectId: string;
  paymentMode: "FIAT" | "CRYPTO";
}) {
  const [state, formAction] = useActionState(fundDepositAction, initialState);

  if (paymentMode === "FIAT") {
    return (
      <div className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          You will be redirected to a mock online banking page to complete the payment.
        </p>
        <Button asChild size="lg" className="h-12 text-base px-6">
          <Link href={`/portal/payments/checkout?projectId=${projectId}&purpose=DEPOSIT`}>
            <DollarSign className="mr-2 h-5 w-5" />
            Pay 50% Deposit
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-4">
      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base ml-2">{state.error}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="projectId" value={projectId} />
      <LoadingButton loadingText="Processing Deposit...">
        <DollarSign className="mr-2 h-5 w-5" />
        Fund 50% Deposit
      </LoadingButton>
    </form>
  );
}

export function DraftUploadForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState(uploadDraftAction, initialState);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();
  const canSubmit = Boolean(fileName);

  useEffect(() => {
    if (state.message) {
      setFileName(null);
      const input = document.getElementById("draftFile") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      router.refresh();
    }
  }, [state.message, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileName(file ? file.name : null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      const input = document.getElementById("draftFile") as HTMLInputElement;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
      }
    }
  };

  return (
    <form action={formAction} className="space-y-5" encType="multipart/form-data">
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base ml-2">{state.error}</AlertDescription>
        </Alert>
      )}
      {state.message && (
        <Alert>
          <CheckCircle className="h-5 w-5" />
          <AlertDescription className="text-base ml-2">{state.message}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="projectId" value={projectId} />

      <div className="space-y-3">
        <Label htmlFor="draftFile" className="text-lg font-semibold">Upload Draft File</Label>
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-muted/30 ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            } ${fileName ? "border-primary/50 bg-primary/5" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("draftFile")?.click()}
        >
          <input
            id="draftFile"
            name="draftFile"
            type="file"
            required
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex flex-col items-center gap-4">
            {fileName ? (
              <>
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <File className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">{fileName}</p>
                  <p className="text-base text-muted-foreground mt-1">Click or drag to replace</p>
                </div>
              </>
            ) : (
              <>
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <CloudUpload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">
                    Drag and drop your file here
                  </p>
                  <p className="text-base text-muted-foreground mt-1">
                    or <span className="text-primary font-medium">browse</span> to select
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {!canSubmit && (
        <p className="text-sm text-muted-foreground">
          Choose a file before uploading.
        </p>
      )}
      <LoadingButton loadingText="Uploading..." disabled={!canSubmit}>
        <Upload className="mr-2 h-5 w-5" />
        Upload Draft
      </LoadingButton>
    </form>
  );
}

export function VerifyDraftForm({ draftId }: { draftId: string }) {
  const [state, formAction] = useActionState(
    verifyDraftAction,
    verifyInitialState
  );
  return (
    <form action={formAction} className="mt-3">
      {state.error && (
        <Alert variant="destructive" className="mb-3">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base ml-2">{state.error}</AlertDescription>
        </Alert>
      )}
      {state.result && (
        <Alert variant={state.result === "MATCH" ? "default" : "destructive"} className="mb-3">
          {state.result === "MATCH" ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <AlertDescription className="text-base ml-2">Integrity check: {state.result}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="draftId" value={draftId} />
      <LoadingButton variant="outline" size="default" loadingText="Verifying..." className="h-10">
        <FileCheck className="mr-2 h-5 w-5" />
        Verify Draft Integrity
      </LoadingButton>
    </form>
  );
}

function formatDiscussionTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRoleBadgeClass(role: string) {
  switch (role) {
    case "ADMIN":
      return "border-red-500/30 bg-red-500/10 text-red-700";
    case "DESIGNER":
      return "border-indigo-500/30 bg-indigo-500/10 text-indigo-700";
    case "CLIENT":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
    default:
      return "border-muted-foreground/20 bg-muted text-muted-foreground";
  }
}

export function DraftDiscussionPanel({
  projectId,
  draftId,
  currentUserId,
  comments,
  canComment,
}: {
  projectId: string;
  draftId: string;
  currentUserId: string;
  comments: DraftDiscussionComment[];
  canComment: boolean;
}) {
  const [state, formAction] = useActionState(
    postDraftCommentAction,
    draftCommentInitialState
  );
  const [message, setMessage] = useState("");
  const [thread, setThread] = useState<DraftDiscussionComment[]>(comments);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    setThread(comments);
  }, [comments]);

  useEffect(() => {
    const latestComment = state.comment;
    if (!latestComment) {
      return;
    }

    setThread((prev) => {
      if (prev.some((comment) => comment.id === latestComment.id)) {
        return prev;
      }
      return [...prev, latestComment];
    });
    setMessage("");
    formRef.current?.reset();
  }, [state.comment]);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [thread.length]);

  const canSubmit = canComment && message.trim().length > 0;

  return (
    <div className="space-y-4 rounded-2xl border-2 border-primary/10 bg-gradient-to-br from-background via-primary/[0.03] to-cyan-500/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquareText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold">Draft Discussion</p>
            <p className="text-xs text-muted-foreground">
              Client, designer, and admin can align revisions here.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {thread.length} comment{thread.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div
        ref={threadRef}
        className="max-h-72 space-y-3 overflow-y-auto rounded-xl border bg-background/80 p-3"
      >
        {thread.length === 0 ? (
          <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
            No comments yet. Start the discussion with concrete feedback.
          </div>
        ) : (
          thread.map((comment) => {
            const isOwn = comment.author.id === currentUserId;
            return (
              <div
                key={comment.id}
                className={`flex gap-3 ${isOwn ? "justify-end" : "justify-start"}`}
              >
                {!isOwn && (
                  <Avatar className="h-9 w-9 border">
                    <AvatarFallback className="text-xs font-semibold">
                      {comment.author.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[85%] space-y-2 rounded-xl border px-3 py-2 shadow-sm sm:max-w-[78%] ${
                    isOwn
                      ? "border-primary/30 bg-primary/10 text-foreground"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{comment.author.name}</span>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getRoleBadgeClass(
                        comment.author.role
                      )}`}
                    >
                      {comment.author.role}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDiscussionTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {comment.message}
                  </p>
                </div>
                {isOwn && (
                  <Avatar className="h-9 w-9 border">
                    <AvatarFallback className="text-xs font-semibold">
                      {comment.author.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })
        )}
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="ml-2 text-base">{state.error}</AlertDescription>
        </Alert>
      )}

      {canComment ? (
        <form ref={formRef} action={formAction} className="space-y-3">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="draftId" value={draftId} />
          <Textarea
            name="message"
            rows={3}
            required
            maxLength={2000}
            placeholder="Add clear revision notes, references, or acceptance feedback..."
            className="text-base"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Keep feedback specific so revisions are faster and clearer.
            </p>
            <LoadingButton
              size="default"
              className="h-10"
              loadingText="Posting..."
              disabled={!canSubmit}
            >
              <SendHorizonal className="mr-2 h-4 w-4" />
              Send comment
            </LoadingButton>
          </div>
        </form>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          Discussion is read-only for completed projects.
        </div>
      )}
    </div>
  );
}

export function ApproveDraftForm({
  projectId,
  paymentMode,
}: {
  projectId: string;
  paymentMode: "FIAT" | "CRYPTO";
}) {
  const [state, formAction] = useActionState(approveDraftAction, initialState);

  if (paymentMode === "FIAT") {
    return (
      <div className="mt-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          You will be redirected to a mock online banking page to complete the payment.
        </p>
        <Button asChild size="lg" className="h-12 text-base px-6">
          <Link href={`/portal/payments/checkout?projectId=${projectId}&purpose=BALANCE`}>
            <CheckCircle className="mr-2 h-5 w-5" />
            Approve Draft + Pay Balance
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-4">
      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base ml-2">{state.error}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="projectId" value={projectId} />
      <LoadingButton loadingText="Processing Approval...">
        <CheckCircle className="mr-2 h-5 w-5" />
        Approve Draft + Pay Balance
      </LoadingButton>
    </form>
  );
}

export function DisputeForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState(openDisputeAction, initialState);
  return (
    <form action={formAction} className="mt-4 space-y-5" encType="multipart/form-data">
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base ml-2">{state.error}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="projectId" value={projectId} />
      <div className="space-y-3">
        <Label htmlFor="description" className="text-base font-medium">Dispute summary</Label>
        <Textarea id="description" name="description" rows={4} required className="text-base" />
      </div>
      <div className="space-y-3">
        <Label htmlFor="evidenceFiles" className="text-base font-medium">Attach evidence files (optional)</Label>
        <Input id="evidenceFiles" name="evidenceFiles" type="file" multiple className="h-12" />
      </div>
      <LoadingButton variant="outline" loadingText="Opening Dispute...">
        <AlertTriangle className="mr-2 h-5 w-5" />
        Open Dispute
      </LoadingButton>
    </form>
  );
}

export function ReleaseForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState(releaseFundsAction, initialState);
  const [isMfaReady, setIsMfaReady] = useState(false);
  return (
    <form action={formAction} className="mt-4 space-y-5">
      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base ml-2">{state.error}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="projectId" value={projectId} />
      <AdminMfaField
        id="mfa-release"
        purpose="release_funds"
        isReady={isMfaReady}
        onCodeSent={() => setIsMfaReady(true)}
      />
      <LoadingButton loadingText="Releasing Funds..." disabled={!isMfaReady}>
        <DollarSign className="mr-2 h-5 w-5" />
        Release Escrow
      </LoadingButton>
    </form>
  );
}

export function RefundForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState(refundFundsAction, initialState);
  const [isMfaReady, setIsMfaReady] = useState(false);
  return (
    <form action={formAction} className="mt-4 space-y-5">
      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base ml-2">{state.error}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="projectId" value={projectId} />
      <AdminMfaField
        id="mfa-refund"
        purpose="refund_funds"
        isReady={isMfaReady}
        onCodeSent={() => setIsMfaReady(true)}
      />
      <LoadingButton
        variant="outline"
        loadingText="Processing Refund..."
        disabled={!isMfaReady}
      >
        <RefreshCw className="mr-2 h-5 w-5" />
        Issue Refund
      </LoadingButton>
    </form>
  );
}

export function ArbitrationForm({
  projectId,
  disputeId,
}: {
  projectId: string;
  disputeId: string;
}) {
  const [state, formAction] = useActionState(
    arbitrateDisputeAction,
    initialState
  );
  const [isMfaReady, setIsMfaReady] = useState(false);
  return (
    <form action={formAction} className="mt-5 space-y-5">
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base ml-2">{state.error}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="disputeId" value={disputeId} />

      <div className="space-y-3">
        <Label htmlFor={`outcome-${disputeId}`} className="text-base font-medium">Outcome</Label>
        <select
          id={`outcome-${disputeId}`}
          name="outcome"
          required
          className="flex h-12 w-full rounded-lg border-2 border-input bg-background px-4 py-2 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="RELEASE">Release funds to company</option>
          <option value="REFUND">Refund client</option>
          <option value="SPLIT">Split payout</option>
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor={`clientPercent-${disputeId}`} className="text-base font-medium">Client %</Label>
          <Input
            id={`clientPercent-${disputeId}`}
            name="clientPercent"
            type="number"
            min="0"
            max="100"
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-3">
          <Label htmlFor={`companyPercent-${disputeId}`} className="text-base font-medium">Company %</Label>
          <Input
            id={`companyPercent-${disputeId}`}
            name="companyPercent"
            type="number"
            min="0"
            max="100"
            className="h-12 text-base"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor={`decisionNote-${disputeId}`} className="text-base font-medium">Decision note</Label>
        <Textarea id={`decisionNote-${disputeId}`} name="decisionNote" rows={3} className="text-base" />
      </div>

      <AdminMfaField
        id={`mfa-arbitrate-${disputeId}`}
        purpose="arbitrate_dispute"
        isReady={isMfaReady}
        onCodeSent={() => setIsMfaReady(true)}
      />

      <LoadingButton loadingText="Recording Decision..." disabled={!isMfaReady}>
        <Gavel className="mr-2 h-5 w-5" />
        Record Decision
      </LoadingButton>
    </form>
  );
}

export function PauseEscrowForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState(pauseEscrowAction, initialState);
  const [isMfaReady, setIsMfaReady] = useState(false);
  return (
    <form action={formAction} className="mt-4 space-y-5">
      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base ml-2">{state.error}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="projectId" value={projectId} />
      <AdminMfaField
        id="mfa-pause"
        purpose="pause_escrow"
        isReady={isMfaReady}
        onCodeSent={() => setIsMfaReady(true)}
      />
      <LoadingButton
        variant="outline"
        loadingText="Pausing Escrow..."
        disabled={!isMfaReady}
      >
        <Pause className="mr-2 h-5 w-5" />
        Pause Escrow Actions
      </LoadingButton>
    </form>
  );
}

export function ResumeEscrowForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState(resumeEscrowAction, initialState);
  const [isMfaReady, setIsMfaReady] = useState(false);
  return (
    <form action={formAction} className="mt-4 space-y-5">
      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base ml-2">{state.error}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="projectId" value={projectId} />
      <AdminMfaField
        id="mfa-resume"
        purpose="resume_escrow"
        isReady={isMfaReady}
        onCodeSent={() => setIsMfaReady(true)}
      />
      <LoadingButton loadingText="Resuming Escrow..." disabled={!isMfaReady}>
        <Play className="mr-2 h-5 w-5" />
        Resume Escrow Actions
      </LoadingButton>
    </form>
  );
}
