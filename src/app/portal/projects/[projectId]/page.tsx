import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { toSafeHref } from "@/lib/inputSecurity";
import {
  ApproveDraftForm,
  ArbitrationForm,
  DepositForm,
  DisputeForm,
  DraftDiscussionPanel,
  DraftUploadForm,
  PauseEscrowForm,
  RefundForm,
  ResumeEscrowForm,
  ReleaseForm,
  VerifyDraftForm,
} from "./forms";
import PaymentSuccessBanner from "./PaymentSuccessBanner";
import ProjectTrustPanel from "./ProjectTrustPanel";
import DeleteProjectButton from "../DeleteProjectButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  FileText,
  AlertTriangle,
  CreditCard,
  Clock,
  Link2,
  Download,
  ExternalLink,
  Wallet,
  Calendar,
  Shield,
  Activity,
  Zap,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  PauseCircle,
  TrendingUp,
  Hash,
} from "lucide-react";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/portal/login");
  }

  if (!projectId || projectId === "undefined") {
    redirect("/portal/projects");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      designer: true,
      admin: true,
      drafts: {
        orderBy: { createdAt: "desc" },
        include: {
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
          },
        },
      },
      disputes: {
        orderBy: { createdAt: "desc" },
        include: {
          openedBy: true,
          decidedBy: true,
          files: {
            orderBy: { createdAt: "desc" },
            include: { uploadedBy: true },
          },
        },
      },
      payments: { orderBy: { createdAt: "desc" } },
      timeline: { orderBy: { createdAt: "desc" } },
      chainEvents: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) {
    redirect("/portal/projects");
  }

  const isClient = project.clientId === user.id;
  const isAdmin = user.role === "ADMIN";
  const isDesigner = user.role === "DESIGNER";

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "outline";
      case "APPROVED":
        return "default";
      case "RELEASED":
        return "secondary";
      case "DISPUTED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "RELEASED":
        return <CheckCircle2 className="h-5 w-5" />;
      case "DISPUTED":
        return <XCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  // Calculate progress percentage based on payments
  const totalAmount = Number(project.quotedAmount);
  const depositPaid = project.payments.some(p => p.type === "DEPOSIT" && p.status === "COMPLETED");
  const balancePaid = project.payments.some(p => p.type === "BALANCE" && p.status === "COMPLETED");
  const progressPercentage = depositPaid && balancePaid ? 100 : depositPaid ? 50 : 0;
  const paymentMode =
    process.env.PAYMENT_MODE?.toUpperCase() === "CRYPTO" ? "CRYPTO" : "FIAT";
  const discussionClosed = ["RELEASED", "REFUNDED", "RESOLVED", "CANCELLED"].includes(project.status);
  const canPostDraftDiscussion = !discussionClosed && (isClient || isAdmin || isDesigner);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PaymentSuccessBanner projectId={project.id} />
      {/* Header Section */}
      <div className="relative">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5 rounded-2xl -z-10" />

        <div className="rounded-2xl border bg-card/50 p-4 backdrop-blur-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              {/* Project Title */}
              <div className="flex flex-wrap items-center gap-4">
                <h1 className="break-words bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  {project.title}
                </h1>
                <Badge
                  variant={getStatusVariant(project.status)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs sm:px-4 sm:text-sm"
                >
                  {getStatusIcon(project.status)}
                  {project.status}
                </Badge>
                {project.escrowPaused && (
                  <Badge
                    variant="destructive"
                    className="flex items-center gap-2 px-3 py-1.5 text-xs sm:px-4 sm:text-sm"
                  >
                    <PauseCircle className="h-5 w-5" />
                    Escrow Paused
                  </Badge>
                )}
              </div>

              {/* Client Info - More Visible */}
              <div className="w-fit rounded-xl border bg-muted/50 p-3 sm:p-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 sm:h-12 sm:w-12">
                    <User className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                      Client
                    </p>
                    <p className="text-lg font-semibold text-foreground sm:text-xl">
                      {project.client.name}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {isAdmin && (
                <DeleteProjectButton
                  projectId={project.id}
                  projectTitle={project.title}
                  redirectTo="/portal/projects"
                  className="h-10 px-4 text-sm sm:h-11 sm:px-5 sm:text-base"
                  size="lg"
                />
              )}
              <Button asChild variant="outline" size="lg" className="h-10 px-4 text-sm sm:h-11 sm:px-5 sm:text-base">
                <Link href="/portal/projects">
                  <ArrowLeft className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Back to Projects
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Overview - Hero Card */}
      <Card className="border-2 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 p-1">
          <CardHeader className="rounded-t-lg bg-card pb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 sm:h-11 sm:w-11">
                  <TrendingUp className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                </div>
                Project Overview
              </CardTitle>
              {/* Progress Indicator */}
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3 md:min-w-[220px] md:justify-end">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Payment Progress</p>
                  <p className="text-xl font-bold text-primary sm:text-2xl">{progressPercentage}%</p>
                </div>
                <div className="w-32 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
        </div>
        <CardContent className="pt-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2 rounded-xl border-2 border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/5 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-5 w-5 text-green-600" />
                Quoted Amount
              </div>
              <p className="text-xl font-bold text-foreground sm:text-2xl">RM {project.quotedAmount.toString()}</p>
            </div>
            <div className="space-y-2 rounded-xl border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-5 w-5 text-blue-600" />
                Deposit (50%)
              </div>
              <p className="text-xl font-bold text-foreground sm:text-2xl">RM {project.depositAmount.toString()}</p>
              {depositPaid && <Badge variant="secondary" className="mt-2">Paid</Badge>}
            </div>
            <div className="space-y-2 rounded-xl border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-violet-500/5 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-5 w-5 text-purple-600" />
                Balance (50%)
              </div>
              <p className="text-xl font-bold text-foreground sm:text-2xl">RM {project.balanceAmount.toString()}</p>
              {balancePaid && <Badge variant="secondary" className="mt-2">Paid</Badge>}
            </div>
            <div className="space-y-2 rounded-xl border-2 border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-amber-500/5 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-5 w-5 text-orange-600" />
                Review Due
              </div>
              <p className="text-lg font-bold text-foreground sm:text-xl">
                {project.reviewDueAt
                  ? project.reviewDueAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  : "Not scheduled"}
              </p>
            </div>
            <div className="space-y-2 rounded-xl border-2 border-teal-500/20 bg-gradient-to-br from-teal-500/10 to-cyan-500/5 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-5 w-5 text-teal-600" />
                Escrow Status
              </div>
              <p className="text-lg font-bold text-foreground sm:text-xl">
                {project.escrowPaused ? "Paused" : "Active"}
              </p>
              <Badge variant={project.escrowPaused ? "destructive" : "secondary"} className="mt-2">
                {project.escrowPaused ? "Paused by Admin" : "Protected"}
              </Badge>
            </div>
          </div>
          <Separator className="my-6" />
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3 sm:p-4">
              <Link2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Escrow Contract</p>
                <p className="break-all font-mono text-xs text-foreground sm:text-sm">{project.escrowAddress ?? "Local demo mode"}</p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
              <Button asChild variant="outline" size="lg" className="h-10 sm:h-11">
                <a href={`/api/receipts/${project.id}`} target="_blank" rel="noreferrer">
                  <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Download Receipt
                </a>
              </Button>
              {project.disputes[0]?.decision && (
                <Button asChild variant="outline" size="lg" className="h-10 sm:h-11">
                  <a
                    href={`/api/receipts/${project.id}/arbitration`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Arbitration Summary
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ProjectTrustPanel
        userRole={user.role}
        status={project.status}
        escrowAddress={project.escrowAddress}
        chainId={project.chainId}
        escrowPaused={project.escrowPaused}
        timeline={project.timeline.map((event) => ({
          eventType: event.eventType,
          txHash: event.txHash,
        }))}
        chainEvents={project.chainEvents.map((event) => ({
          eventName: event.eventName,
          txHash: event.txHash,
        }))}
        drafts={project.drafts.map((draft) => ({
          sha256: draft.sha256,
        }))}
        disputes={project.disputes.map((dispute) => ({
          status: dispute.status,
        }))}
        payments={project.payments.map((payment) => ({
          type: payment.type,
          status: payment.status,
          txHash: payment.txHash,
        }))}
      />

      {/* Action Center */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3 text-xl sm:text-2xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 sm:h-11 sm:w-11">
              <Zap className="h-5 w-5 text-yellow-600 sm:h-6 sm:w-6" />
            </div>
            Action Center
          </CardTitle>
          <CardDescription className="mt-2 text-sm sm:text-base">Available actions based on project status and your role</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {project.escrowPaused && (
            <Alert className="border-destructive/50 bg-destructive/10 p-5">
              <AlertTriangle className="h-5 w-5" />
              <AlertDescription className="ml-2 text-sm sm:text-base">
                Escrow actions are paused. Funding, approvals, and releases are
                temporarily disabled.
              </AlertDescription>
            </Alert>
          )}
          {isClient && project.status === "DRAFT" && !project.escrowPaused && (
            <DepositForm projectId={project.id} paymentMode={paymentMode} />
          )}
          {(isDesigner || isAdmin) && (
            <DraftUploadForm projectId={project.id} />
          )}
          {isClient && project.status === "DRAFT_SUBMITTED" && !project.escrowPaused && (
            <ApproveDraftForm projectId={project.id} paymentMode={paymentMode} />
          )}
          {isClient &&
            (project.status === "DRAFT_SUBMITTED" ||
              project.status === "APPROVED") && (
              <DisputeForm projectId={project.id} />
            )}
          {isAdmin && project.status === "APPROVED" && !project.escrowPaused && (
            <ReleaseForm projectId={project.id} />
          )}
          {isAdmin &&
            !["RELEASED", "REFUNDED", "RESOLVED"].includes(project.status) &&
            !project.escrowPaused && (
              <RefundForm projectId={project.id} />
            )}
          {isAdmin && project.escrowAddress && project.escrowPaused && (
            <ResumeEscrowForm projectId={project.id} />
          )}
          {isAdmin && project.escrowAddress && !project.escrowPaused && (
            <PauseEscrowForm projectId={project.id} />
          )}
          {!isClient && !isAdmin && !isDesigner && (
            <p className="py-8 text-center text-base text-muted-foreground">No actions available for your role.</p>
          )}
        </CardContent>
      </Card>

      {/* Full Width Layout for Drafts and Disputes */}
      <div className="space-y-8">
        {/* Draft Deliverables */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              Draft Deliverables
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  <FileText className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <p className="text-xl text-muted-foreground">No drafts uploaded yet</p>
                <p className="text-base text-muted-foreground/70 mt-2">Drafts will appear here once submitted</p>
              </div>
            ) : (
              <div className="space-y-5">
                {project.drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="space-y-4 rounded-xl border-2 bg-muted/20 p-4 transition-colors hover:bg-muted/30 sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="break-all text-base font-semibold sm:text-lg">{draft.fileName}</span>
                      <Button asChild variant="outline" size="default">
                        <a href={toSafeHref(draft.fileUrl)} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                          View file
                        </a>
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-mono truncate">
                        SHA-256: {draft.sha256}
                      </p>
                    </div>
                    <VerifyDraftForm draftId={draft.id} />
                    <DraftDiscussionPanel
                      projectId={project.id}
                      draftId={draft.id}
                      currentUserId={user.id}
                      canComment={canPostDraftDiscussion}
                      comments={draft.comments.map((comment) => ({
                        id: comment.id,
                        message: comment.message,
                        createdAt: comment.createdAt.toISOString(),
                        author: {
                          id: comment.author.id,
                          name: comment.author.name,
                          role: comment.author.role,
                        },
                      }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disputes */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              Disputes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.disputes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                  <Shield className="h-10 w-10 text-green-500" />
                </div>
                <p className="text-xl text-foreground font-medium">No disputes opened</p>
                <p className="text-base text-muted-foreground mt-2">This project is running smoothly</p>
              </div>
            ) : (
              <div className="space-y-5">
                {project.disputes.map((dispute) => (
                  <div
                    key={dispute.id}
                    className="space-y-4 rounded-xl border-2 bg-muted/20 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <Badge variant={dispute.status === "OPEN" ? "destructive" : "secondary"} className="w-fit text-xs sm:text-sm">
                        {dispute.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Opened by {dispute.openedBy.name} · {dispute.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base">{dispute.description}</p>
                    {dispute.decision && (
                      <div className="rounded-lg bg-muted p-4 text-sm sm:text-base">
                        <span className="font-semibold">Decision:</span> {dispute.decision}
                        {dispute.clientPercent && ` (${dispute.clientPercent}% client)`}
                      </div>
                    )}
                    {dispute.files.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-base font-semibold">Evidence files</p>
                        <div className="space-y-3">
                          {dispute.files.map((file) => (
                            <div
                              key={file.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 bg-background px-4 py-3"
                            >
                              <div>
                                <div className="break-all text-base font-medium">{file.fileName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {file.uploadedBy.name} · {file.createdAt.toLocaleDateString()}
                                </div>
                              </div>
                              <Button asChild size="default" variant="outline">
                                <a href={toSafeHref(file.fileUrl)} target="_blank" rel="noreferrer">
                                  <Download className="mr-2 h-5 w-5" />
                                  View
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {isAdmin && dispute.status === "OPEN" && (
                      <ArbitrationForm
                        projectId={project.id}
                        disputeId={dispute.id}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Log */}
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            Payment Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {project.payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <CreditCard className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-xl text-muted-foreground">No payments recorded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {project.payments.map((payment) => {
                const metadata =
                  payment.metadata && typeof payment.metadata === "object"
                    ? (payment.metadata as Record<string, unknown>)
                    : null;
                const method = metadata?.method as string | undefined;
                const provider = metadata?.provider as string | undefined;
                const reference = metadata?.reference as string | undefined;
                const mode = metadata?.mode as string | undefined;

                return (
                  <div
                    key={payment.id}
                    className="flex flex-col gap-4 rounded-xl border-2 bg-muted/20 p-4 transition-colors hover:bg-muted/30 sm:p-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${payment.type === "DEPOSIT" ? "bg-blue-500/10" : "bg-purple-500/10"
                        }`}>
                        <Wallet className={`h-5 w-5 ${payment.type === "DEPOSIT" ? "text-blue-600" : "text-purple-600"}`} />
                      </div>
                      <div>
                        <Badge variant="outline" className="mb-2 text-xs sm:text-sm">{payment.type}</Badge>
                        <p className="text-xl font-bold">RM {payment.amount.toString()}</p>
                        {(method || provider || reference || mode) && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {mode === "FIAT" ? "Fiat" : mode === "CRYPTO" ? "On-chain" : "Payment"}{method ? ` · ${method}` : ""}
                            {provider ? ` · ${provider}` : ""}
                            {reference ? ` · Ref: ${reference}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={payment.status === "COMPLETED" ? "secondary" : "outline"} className="w-fit text-xs sm:text-sm">
                      {payment.status === "COMPLETED" && <CheckCircle2 className="h-4 w-4 mr-2" />}
                      {payment.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline and On-chain Events */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Timeline */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              Project Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Clock className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <p className="text-xl text-muted-foreground">No timeline events yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {project.timeline.map((event, index) => (
                  <div key={event.id} className="flex gap-3 sm:gap-5">
                    <div className="flex flex-col items-center">
                      <div className="h-5 w-5 rounded-full bg-primary ring-4 ring-primary/20" />
                      {index < project.timeline.length - 1 && (
                        <div className="w-1 flex-1 bg-border rounded-full my-2" />
                      )}
                    </div>
                    <div className="pb-8 flex-1">
                      <p className="text-base font-semibold text-foreground sm:text-lg">{event.eventType.replace(/_/g, ' ')}</p>
                      <p className="mt-2 text-sm text-muted-foreground sm:text-base">{event.message}</p>
                      <p className="text-sm text-muted-foreground mt-2">{event.createdAt.toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* On-chain Events */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-cyan-600" />
              </div>
              On-chain Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project.chainEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Link2 className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <p className="text-xl text-muted-foreground">No on-chain events yet</p>
                <p className="text-base text-muted-foreground/70 mt-2">Blockchain transactions will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {project.chainEvents.map((event) => (
                  <div
                    key={event.id}
                    className="space-y-3 rounded-xl border-2 bg-muted/20 p-4 transition-colors hover:bg-muted/30 sm:p-5"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Badge variant="outline" className="w-fit text-xs sm:text-sm">{event.eventName}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {event.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm text-muted-foreground font-mono truncate">
                        {event.txHash}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
