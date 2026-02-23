"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/storage";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  fundBalance,
  fundDeposit,
  pauseEscrow,
  recordBalanceFiat,
  recordDepositFiat,
  refundEscrow,
  releaseEscrow,
  splitEscrow,
  unpauseEscrow,
} from "@/lib/blockchain";
import { notifyAdmins, notifyUsers } from "@/lib/notifications";
import { ensureUserWallet } from "@/lib/userWallet";
import { assertAdminMfa } from "@/lib/mfa";
import {
  getSanitizedFormText,
  getSanitizedOptionalFormText,
  sanitizeTextInput,
} from "@/lib/inputSecurity";
import {
  getPaymentMode,
  parsePaymentMethod,
  processMockPayment,
} from "@/lib/paymentGateway";

type FormState = {
  error?: string;
  message?: string;
  result?: "MATCH" | "MISMATCH";
};

type DraftCommentActionState = {
  error?: string;
  message?: string;
  comment?: {
    id: string;
    message: string;
    createdAt: string;
    author: {
      id: string;
      name: string;
      role: string;
    };
  };
};

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Please sign in.");
  }
  return user;
}

const projectIdSchema = z.object({
  projectId: z.string().min(1),
});

async function getProjectAdminWalletKey(project: { adminId: string | null }) {
  if (!project.adminId) {
    throw new Error("Project admin not assigned.");
  }
  const admin = await ensureUserWallet(project.adminId);
  if (!admin.walletPrivateKey) {
    throw new Error("Admin wallet not available.");
  }
  return admin.walletPrivateKey;
}

function isProjectParticipant(
  project: {
    clientId: string;
    designerId: string | null;
    adminId: string | null;
  },
  user: { id: string; role: string }
) {
  return (
    user.role === "ADMIN" ||
    user.role === "DESIGNER" ||
    project.clientId === user.id ||
    project.designerId === user.id ||
    project.adminId === user.id
  );
}

function resolveStoredFilePath(fileUrl: string) {
  const normalizedPath = sanitizeTextInput(fileUrl, {
    trim: true,
    allowNewlines: false,
    normalizeUnicode: false,
    maxLength: 2048,
  }).replace(/^\/+/, "");

  if (!normalizedPath) {
    throw new Error("Invalid file path.");
  }

  const publicRoot = path.resolve(process.cwd(), "public");
  const absolutePath = path.resolve(publicRoot, normalizedPath);
  const safePrefix = `${publicRoot}${path.sep}`;
  if (absolutePath !== publicRoot && !absolutePath.startsWith(safePrefix)) {
    throw new Error("Unsafe file path.");
  }

  return absolutePath;
}

export async function deleteProjectAction(projectId: string): Promise<FormState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || currentUser.role !== "ADMIN") {
    return { error: "Admin access required." };
  }

  const parsed = z
    .string()
    .min(1)
    .safeParse(
      sanitizeTextInput(projectId, {
        allowNewlines: false,
        maxLength: 128,
      })
    );
  if (!parsed.success) {
    return { error: "Invalid project." };
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data },
    select: { id: true, title: true, enquiryId: true },
  });

  if (!project) {
    return { error: "Project not found." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.draftComment.deleteMany({
        where: { draft: { projectId: project.id } },
      });
      await tx.draft.deleteMany({ where: { projectId: project.id } });
      await tx.disputeFile.deleteMany({
        where: { dispute: { projectId: project.id } },
      });
      await tx.dispute.deleteMany({ where: { projectId: project.id } });
      await tx.payment.deleteMany({ where: { projectId: project.id } });
      await tx.timelineEvent.deleteMany({ where: { projectId: project.id } });
      await tx.chainEvent.deleteMany({ where: { projectId: project.id } });

      await tx.project.delete({ where: { id: project.id } });

      if (project.enquiryId) {
        await tx.enquiry.updateMany({
          where: { id: project.enquiryId, status: "PROJECT_CREATED" },
          data: { status: "APPROVED" },
        });
      }
    });
  } catch (error) {
    return { error: (error as Error).message || "Failed to delete project." };
  }

  revalidatePath("/portal/projects");
  revalidatePath("/portal/enquiries");
  revalidatePath("/portal/admin");
  return { message: `Project \"${project.title}\" deleted.` };
}

export async function fundDepositAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const user = await requireUser();
    const parsed = projectIdSchema.safeParse({
      projectId: getSanitizedFormText(formData, "projectId", {
        allowNewlines: false,
        maxLength: 128,
      }),
    });
    if (!parsed.success) {
      return { error: "Invalid project." };
    }

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });

    if (!project) {
      return { error: "Project not found." };
    }

    if (project.clientId !== user.id) {
      return { error: "Only the client can fund the deposit." };
    }

    if (project.status !== "DRAFT") {
      return { error: "Deposit already funded or project not ready." };
    }

    if (project.escrowPaused) {
      return { error: "Escrow actions are currently paused by the admin." };
    }

    if (!project.escrowAddress) {
      return { error: "Escrow contract not deployed yet." };
    }

    const paymentMode = getPaymentMode();
    let txHash = "";
    let paymentMetadata: Record<string, string> | undefined;

    if (paymentMode === "FIAT") {
      const method = parsePaymentMethod(
        getSanitizedFormText(formData, "paymentMethod", {
          allowNewlines: false,
          maxLength: 32,
        })
      );
      if (!method) {
        return { error: "Please choose a payment method." };
      }
      const payment = await processMockPayment({
        method,
        amount: project.depositAmount.toString(),
        projectId: project.id,
        userId: user.id,
        purpose: "DEPOSIT",
      });
      const adminWalletKey = await getProjectAdminWalletKey(project);
      try {
        const tx = await recordDepositFiat(project.escrowAddress, adminWalletKey);
        txHash = tx.hash;
      } catch (error) {
        return {
          error:
            "This escrow contract was deployed before the FIAT demo update. Please create a new project or set PAYMENT_MODE=CRYPTO.",
        };
      }
      paymentMetadata = {
        mode: "FIAT",
        provider: payment.provider,
        method: payment.method,
        reference: payment.reference,
      };
    } else {
      const client = await ensureUserWallet(user.id);
      if (!client.walletPrivateKey) {
        return { error: "Client wallet not available." };
      }
      const tx = await fundDeposit(
        project.escrowAddress,
        client.walletPrivateKey,
        project.depositAmount.toString()
      );
      txHash = tx.hash;
      paymentMetadata = { mode: "CRYPTO" };
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: "FUNDED",
        timeline: {
          create: {
            actorId: user.id,
            eventType: "DEPOSIT_FUNDED",
            message:
              paymentMode === "FIAT"
                ? "Client paid the 50% deposit via fiat gateway (demo)."
                : "Client funded the 50% deposit on-chain.",
            txHash: txHash,
          },
        },
        payments: {
          create: {
            type: "DEPOSIT",
            status: "COMPLETED",
            amount: project.depositAmount,
            txHash: txHash,
            metadata: paymentMetadata,
          },
        },
        chainEvents: {
          create: {
            eventName: "DepositFunded",
            txHash: txHash,
            payload: {
              amount: project.depositAmount.toString(),
              ...(paymentMetadata ?? {}),
            },
          },
        },
      },
    });

    await notifyAdmins(
      "Deposit funded",
      `Deposit received for project "${project.title}".`
    );

    return {};
  } catch (error) {
    return { error: (error as Error).message };
  }
}

const draftSchema = z.object({
  projectId: z.string().min(1),
});

export async function uploadDraftAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const user = await requireUser();
    const parsed = draftSchema.safeParse({
      projectId: getSanitizedFormText(formData, "projectId", {
        allowNewlines: false,
        maxLength: 128,
      }),
    });
    if (!parsed.success) {
      return { error: "Invalid project." };
    }

    const file = formData.get("draftFile");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Please upload a draft file." };
    }

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });

    if (!project) {
      return { error: "Project not found." };
    }

    if (user.role === "CLIENT") {
      return { error: "Only designers or admins can upload drafts." };
    }

    const stored = await saveUploadedFile(file, "drafts");
    const reviewDueAt = new Date();
    reviewDueAt.setDate(reviewDueAt.getDate() + 7);

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: "DRAFT_SUBMITTED",
        reviewDueAt,
        drafts: {
          create: {
            uploadedById: user.id,
            fileName: stored.fileName,
            fileUrl: stored.url,
            sha256: stored.sha256,
          },
        },
        timeline: {
          create: {
            actorId: user.id,
            eventType: "DRAFT_SUBMITTED",
            message: "Draft deliverable uploaded.",
            metadata: {
              hash: stored.sha256,
            },
          },
        },
      },
    });

    await notifyUsers(
      [project.clientId],
      "Draft uploaded",
      `A draft has been submitted for "${project.title}".`
    );

    revalidatePath("/portal/projects");
    revalidatePath(`/portal/projects/${project.id}`);

    return { message: "Draft uploaded successfully." };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function approveDraftAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const user = await requireUser();
    const parsed = projectIdSchema.safeParse({
      projectId: getSanitizedFormText(formData, "projectId", {
        allowNewlines: false,
        maxLength: 128,
      }),
    });
    if (!parsed.success) {
      return { error: "Invalid project." };
    }

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });

    if (!project) {
      return { error: "Project not found." };
    }

    if (project.clientId !== user.id) {
      return { error: "Only the client can approve drafts." };
    }

    if (project.status !== "DRAFT_SUBMITTED") {
      return { error: "Draft is not ready for approval." };
    }

    if (project.escrowPaused) {
      return { error: "Escrow actions are currently paused by the admin." };
    }

    if (!project.escrowAddress) {
      return { error: "Escrow contract not deployed yet." };
    }

    const paymentMode = getPaymentMode();
    let txHash = "";
    let paymentMetadata: Record<string, string> | undefined;

    if (paymentMode === "FIAT") {
      const method = parsePaymentMethod(
        getSanitizedFormText(formData, "paymentMethod", {
          allowNewlines: false,
          maxLength: 32,
        })
      );
      if (!method) {
        return { error: "Please choose a payment method." };
      }
      const payment = await processMockPayment({
        method,
        amount: project.balanceAmount.toString(),
        projectId: project.id,
        userId: user.id,
        purpose: "BALANCE",
      });
      const adminWalletKey = await getProjectAdminWalletKey(project);
      try {
        const tx = await recordBalanceFiat(project.escrowAddress, adminWalletKey);
        txHash = tx.hash;
      } catch (error) {
        return {
          error:
            "This escrow contract was deployed before the FIAT demo update. Please create a new project or set PAYMENT_MODE=CRYPTO.",
        };
      }
      paymentMetadata = {
        mode: "FIAT",
        provider: payment.provider,
        method: payment.method,
        reference: payment.reference,
      };
    } else {
      const client = await ensureUserWallet(user.id);
      if (!client.walletPrivateKey) {
        return { error: "Client wallet not available." };
      }
      const tx = await fundBalance(
        project.escrowAddress,
        client.walletPrivateKey,
        project.balanceAmount.toString()
      );
      txHash = tx.hash;
      paymentMetadata = { mode: "CRYPTO" };
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: "APPROVED",
        timeline: {
          create: {
            actorId: user.id,
            eventType: "DRAFT_APPROVED",
            message:
              paymentMode === "FIAT"
                ? "Client approved the draft and paid the balance via fiat gateway (demo)."
                : "Client approved the draft and funded the balance on-chain.",
            txHash: txHash,
          },
        },
        payments: {
          create: {
            type: "BALANCE",
            status: "COMPLETED",
            amount: project.balanceAmount,
            txHash: txHash,
            metadata: paymentMetadata,
          },
        },
        chainEvents: {
          create: {
            eventName: "BalanceFunded",
            txHash: txHash,
            payload: {
              amount: project.balanceAmount.toString(),
              ...(paymentMetadata ?? {}),
            },
          },
        },
      },
    });

    await notifyAdmins(
      "Draft approved",
      `Client approved the draft for "${project.title}" and funded the balance.`
    );

    return {};
  } catch (error) {
    return { error: (error as Error).message };
  }
}

const draftCommentSchema = z.object({
  projectId: z.string().min(1),
  draftId: z.string().min(1),
  message: z.string().min(1, "Comment cannot be empty.").max(2000),
});

export async function postDraftCommentAction(
  _: DraftCommentActionState,
  formData: FormData
): Promise<DraftCommentActionState> {
  try {
    const user = await requireUser();

    const parsed = draftCommentSchema.safeParse({
      projectId: getSanitizedFormText(formData, "projectId", {
        allowNewlines: false,
        maxLength: 128,
      }),
      draftId: getSanitizedFormText(formData, "draftId", {
        allowNewlines: false,
        maxLength: 128,
      }),
      message: getSanitizedFormText(formData, "message", {
        maxLength: 2000,
      }),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid comment input." };
    }

    const draft = await prisma.draft.findUnique({
      where: { id: parsed.data.draftId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            clientId: true,
            designerId: true,
            adminId: true,
          },
        },
      },
    });

    if (!draft || draft.projectId !== parsed.data.projectId) {
      return { error: "Draft not found." };
    }

    if (!isProjectParticipant(draft.project, user)) {
      return { error: "You do not have access to this discussion." };
    }

    if (["RELEASED", "REFUNDED", "RESOLVED", "CANCELLED"].includes(draft.project.status)) {
      return { error: "Discussion is closed for completed projects." };
    }

    const comment = await prisma.draftComment.create({
      data: {
        draftId: draft.id,
        authorId: user.id,
        message: parsed.data.message,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    await prisma.timelineEvent.create({
      data: {
        projectId: draft.project.id,
        actorId: user.id,
        eventType: "DRAFT_COMMENT_ADDED",
        message: `New discussion comment added on "${draft.fileName}".`,
        metadata: {
          draftId: draft.id,
          commentId: comment.id,
        },
      },
    });

    const recipients = Array.from(
      new Set(
        [draft.project.clientId, draft.project.designerId, draft.project.adminId]
          .filter((id): id is string => Boolean(id))
          .filter((id) => id !== user.id)
      )
    );

    if (recipients.length > 0) {
      await notifyUsers(
        recipients,
        "New draft comment",
        `${comment.author.name} added feedback in "${draft.project.title}".`
      );
    }

    revalidatePath("/portal/projects");
    revalidatePath(`/portal/projects/${draft.project.id}`);

    return {
      message: "Comment posted.",
      comment: {
        id: comment.id,
        message: comment.message,
        createdAt: comment.createdAt.toISOString(),
        author: {
          id: comment.author.id,
          name: comment.author.name,
          role: comment.author.role,
        },
      },
    };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

const disputeSchema = z.object({
  projectId: z.string().min(1),
  description: z.string().min(10, "Describe the dispute in at least 10 characters."),
});

export async function openDisputeAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const user = await requireUser();
    const parsed = disputeSchema.safeParse({
      projectId: getSanitizedFormText(formData, "projectId", {
        allowNewlines: false,
        maxLength: 128,
      }),
      description: getSanitizedFormText(formData, "description", {
        maxLength: 5000,
      }),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });

    if (!project) {
      return { error: "Project not found." };
    }

    if (project.clientId !== user.id) {
      return { error: "Only the client can open a dispute." };
    }

    if (project.status !== "DRAFT_SUBMITTED" && project.status !== "APPROVED") {
      return { error: "Dispute can only be opened after draft submission." };
    }

    const evidenceFiles = formData
      .getAll("evidenceFiles")
      .filter((file): file is File => file instanceof File && file.size > 0);

    const storedEvidence = await Promise.all(
      evidenceFiles.map((file) => saveUploadedFile(file, "disputes"))
    );

    await prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.create({
        data: {
          projectId: project.id,
          openedById: user.id,
          description: parsed.data.description,
        },
      });

      await tx.project.update({
        where: { id: project.id },
        data: {
          status: "DISPUTED",
          timeline: {
            create: {
              actorId: user.id,
              eventType: "DISPUTE_OPENED",
              message: "Client opened a dispute.",
            },
          },
        },
      });

      if (storedEvidence.length > 0) {
        await tx.disputeFile.createMany({
          data: storedEvidence.map((file) => ({
            disputeId: dispute.id,
            uploadedById: user.id,
            fileName: file.fileName,
            fileUrl: file.url,
            sha256: file.sha256,
          })),
        });
      }
    });

    await notifyAdmins(
      "Dispute opened",
      `A dispute was opened for "${project.title}".`
    );

    return {};
  } catch (error) {
    return { error: (error as Error).message };
  }
}

const arbitrationSchema = z.object({
  projectId: z.string().min(1),
  disputeId: z.string().min(1),
  outcome: z.enum(["RELEASE", "REFUND", "SPLIT"]),
  clientPercent: z.string().optional(),
  companyPercent: z.string().optional(),
  decisionNote: z.string().optional(),
});

export async function arbitrateDisputeAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const user = await requireUser();
    if (user.role !== "ADMIN") {
      return { error: "Admin access required." };
    }

    try {
      await assertAdminMfa(formData, user, "arbitrate_dispute");
    } catch (error) {
      return { error: (error as Error).message };
    }

    const parsed = arbitrationSchema.safeParse({
      projectId: getSanitizedFormText(formData, "projectId", {
        allowNewlines: false,
        maxLength: 128,
      }),
      disputeId: getSanitizedFormText(formData, "disputeId", {
        allowNewlines: false,
        maxLength: 128,
      }),
      outcome: getSanitizedFormText(formData, "outcome", {
        allowNewlines: false,
        maxLength: 16,
      }),
      clientPercent: getSanitizedOptionalFormText(formData, "clientPercent", {
        allowNewlines: false,
        maxLength: 3,
      }),
      companyPercent: getSanitizedOptionalFormText(formData, "companyPercent", {
        allowNewlines: false,
        maxLength: 3,
      }),
      decisionNote: getSanitizedOptionalFormText(formData, "decisionNote", {
        maxLength: 2000,
      }),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });

    if (!project) {
      return { error: "Project not found." };
    }

    if (!project.escrowAddress) {
      return { error: "Escrow contract not deployed yet." };
    }

    if (project.escrowPaused) {
      return { error: "Escrow actions are currently paused by the admin." };
    }

    const admin = await ensureUserWallet(user.id);
    if (!admin.walletPrivateKey) {
      return { error: "Admin wallet not available." };
    }

    let nextStatus = project.status;
    let txHash = "";
    if (parsed.data.outcome === "RELEASE") {
      nextStatus = "RELEASED";
      const tx = await releaseEscrow(
        project.escrowAddress,
        admin.walletPrivateKey
      );
      txHash = tx.hash;
    } else if (parsed.data.outcome === "REFUND") {
      nextStatus = "REFUNDED";
      const tx = await refundEscrow(
        project.escrowAddress,
        admin.walletPrivateKey
      );
      txHash = tx.hash;
    } else {
      nextStatus = "RESOLVED";
      const splitPercent = parsed.data.clientPercent
        ? parseInt(parsed.data.clientPercent, 10)
        : 50;
      const tx = await splitEscrow(
        project.escrowAddress,
        admin.walletPrivateKey,
        splitPercent
      );
      txHash = tx.hash;
    }

    const clientPercent = parsed.data.clientPercent
      ? parseInt(parsed.data.clientPercent, 10)
      : undefined;
    const companyPercent = parsed.data.companyPercent
      ? parseInt(parsed.data.companyPercent, 10)
      : undefined;

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: nextStatus,
        disputes: {
          update: {
            where: { id: parsed.data.disputeId },
            data: {
              status: "ARBITRATED",
              decision: parsed.data.outcome,
              decisionNote: parsed.data.decisionNote,
              decidedById: user.id,
              clientPercent,
              companyPercent,
            },
          },
        },
        timeline: {
          create: {
            actorId: user.id,
            eventType: "DISPUTE_ARBITRATED",
            message: `Admin ruling: ${parsed.data.outcome}.`,
            txHash: txHash || undefined,
          },
        },
        payments: {
          create: {
            type: parsed.data.outcome === "RELEASE" ? "RELEASE" : parsed.data.outcome === "REFUND" ? "REFUND" : "SPLIT",
            status: "COMPLETED",
            amount: project.quotedAmount,
            txHash: txHash || undefined,
            metadata: {
              clientPercent,
              companyPercent,
            },
          },
        },
        chainEvents: txHash
          ? {
              create: {
                eventName:
                  parsed.data.outcome === "RELEASE"
                    ? "FundsReleased"
                    : parsed.data.outcome === "REFUND"
                    ? "FundsRefunded"
                    : "FundsSplit",
                txHash,
                payload: {
                  clientPercent,
                  companyPercent,
                },
              },
            }
          : undefined,
      },
    });

    await notifyUsers(
      [project.clientId, project.designerId].filter(Boolean) as string[],
      "Arbitration decision",
      `Admin issued a ${parsed.data.outcome.toLowerCase()} decision for "${project.title}".`
    );

    return {};
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function releaseFundsAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const user = await requireUser();
    if (user.role !== "ADMIN") {
      return { error: "Admin access required." };
    }

    try {
      await assertAdminMfa(formData, user, "release_funds");
    } catch (error) {
      return { error: (error as Error).message };
    }

    const parsed = projectIdSchema.safeParse({
      projectId: getSanitizedFormText(formData, "projectId", {
        allowNewlines: false,
        maxLength: 128,
      }),
    });
    if (!parsed.success) {
      return { error: "Invalid project." };
    }

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });

    if (!project) {
      return { error: "Project not found." };
    }

    if (project.status !== "APPROVED") {
      return { error: "Project must be approved before release." };
    }

    if (project.escrowPaused) {
      return { error: "Escrow actions are currently paused by the admin." };
    }

    if (!project.escrowAddress) {
      return { error: "Escrow contract not deployed yet." };
    }

    const admin = await ensureUserWallet(user.id);
    if (!admin.walletPrivateKey) {
      return { error: "Admin wallet not available." };
    }

    const tx = await releaseEscrow(project.escrowAddress, admin.walletPrivateKey);

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: "RELEASED",
        timeline: {
          create: {
            actorId: user.id,
            eventType: "FUNDS_RELEASED",
            message: "Admin released escrow funds to the company.",
            txHash: tx.hash,
          },
        },
        payments: {
          create: {
            type: "RELEASE",
            status: "COMPLETED",
            amount: project.quotedAmount,
            txHash: tx.hash,
          },
        },
        chainEvents: {
          create: {
            eventName: "FundsReleased",
            txHash: tx.hash,
          },
        },
      },
    });

    await notifyUsers(
      [project.clientId],
      "Funds released",
      `Escrow for "${project.title}" has been released to the company.`
    );

    return {};
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function refundFundsAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const user = await requireUser();
    if (user.role !== "ADMIN") {
      return { error: "Admin access required." };
    }

    try {
      await assertAdminMfa(formData, user, "refund_funds");
    } catch (error) {
      return { error: (error as Error).message };
    }

    const parsed = projectIdSchema.safeParse({
      projectId: getSanitizedFormText(formData, "projectId", {
        allowNewlines: false,
        maxLength: 128,
      }),
    });
    if (!parsed.success) {
      return { error: "Invalid project." };
    }

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });

    if (!project) {
      return { error: "Project not found." };
    }

    if (!project.escrowAddress) {
      return { error: "Escrow contract not deployed yet." };
    }

    if (project.escrowPaused) {
      return { error: "Escrow actions are currently paused by the admin." };
    }

    const admin = await ensureUserWallet(user.id);
    if (!admin.walletPrivateKey) {
      return { error: "Admin wallet not available." };
    }

    const tx = await refundEscrow(project.escrowAddress, admin.walletPrivateKey);

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: "REFUNDED",
        timeline: {
          create: {
            actorId: user.id,
            eventType: "FUNDS_REFUNDED",
            message: "Admin issued a refund to the client.",
            txHash: tx.hash,
          },
        },
        payments: {
          create: {
            type: "REFUND",
            status: "COMPLETED",
            amount: project.depositAmount,
            txHash: tx.hash,
          },
        },
        chainEvents: {
          create: {
            eventName: "FundsRefunded",
            txHash: tx.hash,
          },
        },
      },
    });

    await notifyUsers(
      [project.clientId],
      "Refund issued",
      `Escrow refund processed for "${project.title}".`
    );

    return {};
  } catch (error) {
    return { error: (error as Error).message };
  }
}

const verifySchema = z.object({
  draftId: z.string().min(1),
});

export async function verifyDraftAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    await requireUser();
    const parsed = verifySchema.safeParse({
      draftId: getSanitizedFormText(formData, "draftId", {
        allowNewlines: false,
        maxLength: 128,
      }),
    });
    if (!parsed.success) {
      return { error: "Invalid draft." };
    }

    const draft = await prisma.draft.findUnique({
      where: { id: parsed.data.draftId },
    });

    if (!draft) {
      return { error: "Draft not found." };
    }

    const absolutePath = resolveStoredFilePath(draft.fileUrl);
    const buffer = await fs.readFile(absolutePath);
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    const result: "MATCH" | "MISMATCH" =
      sha256 === draft.sha256 ? "MATCH" : "MISMATCH";
    return {
      error: result === "MATCH" ? undefined : "Hash mismatch detected.",
      result,
    };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function pauseEscrowAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const user = await requireUser();
    if (user.role !== "ADMIN") {
      return { error: "Admin access required." };
    }

    try {
      await assertAdminMfa(formData, user, "pause_escrow");
    } catch (error) {
      return { error: (error as Error).message };
    }

    const parsed = projectIdSchema.safeParse({
      projectId: getSanitizedFormText(formData, "projectId", {
        allowNewlines: false,
        maxLength: 128,
      }),
    });
    if (!parsed.success) {
      return { error: "Invalid project." };
    }

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });

    if (!project) {
      return { error: "Project not found." };
    }

    if (!project.escrowAddress) {
      return { error: "Escrow contract not deployed yet." };
    }

    if (project.escrowPaused) {
      return { error: "Escrow is already paused." };
    }

    const admin = await ensureUserWallet(user.id);
    if (!admin.walletPrivateKey) {
      return { error: "Admin wallet not available." };
    }

    const tx = await pauseEscrow(project.escrowAddress, admin.walletPrivateKey);

    await prisma.project.update({
      where: { id: project.id },
      data: {
        escrowPaused: true,
        timeline: {
          create: {
            actorId: user.id,
            eventType: "ESCROW_PAUSED",
            message: "Admin paused escrow actions.",
            txHash: tx.hash,
          },
        },
        chainEvents: {
          create: {
            eventName: "EscrowPaused",
            txHash: tx.hash,
          },
        },
      },
    });

    await notifyUsers(
      [project.clientId, project.designerId].filter(Boolean) as string[],
      "Escrow paused",
      `Admin paused escrow actions for "${project.title}".`
    );

    return {};
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function resumeEscrowAction(
  _: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const user = await requireUser();
    if (user.role !== "ADMIN") {
      return { error: "Admin access required." };
    }

    try {
      await assertAdminMfa(formData, user, "resume_escrow");
    } catch (error) {
      return { error: (error as Error).message };
    }

    const parsed = projectIdSchema.safeParse({
      projectId: getSanitizedFormText(formData, "projectId", {
        allowNewlines: false,
        maxLength: 128,
      }),
    });
    if (!parsed.success) {
      return { error: "Invalid project." };
    }

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
    });

    if (!project) {
      return { error: "Project not found." };
    }

    if (!project.escrowAddress) {
      return { error: "Escrow contract not deployed yet." };
    }

    if (!project.escrowPaused) {
      return { error: "Escrow is not paused." };
    }

    const admin = await ensureUserWallet(user.id);
    if (!admin.walletPrivateKey) {
      return { error: "Admin wallet not available." };
    }

    const tx = await unpauseEscrow(
      project.escrowAddress,
      admin.walletPrivateKey
    );

    await prisma.project.update({
      where: { id: project.id },
      data: {
        escrowPaused: false,
        timeline: {
          create: {
            actorId: user.id,
            eventType: "ESCROW_RESUMED",
            message: "Admin resumed escrow actions.",
            txHash: tx.hash,
          },
        },
        chainEvents: {
          create: {
            eventName: "EscrowResumed",
            txHash: tx.hash,
          },
        },
      },
    });

    await notifyUsers(
      [project.clientId, project.designerId].filter(Boolean) as string[],
      "Escrow resumed",
      `Admin resumed escrow actions for "${project.title}".`
    );

    return {};
  } catch (error) {
    return { error: (error as Error).message };
  }
}
