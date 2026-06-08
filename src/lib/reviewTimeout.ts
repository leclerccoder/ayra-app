import { prisma } from "@/lib/db";
import { releaseEscrow } from "@/lib/blockchain";

type ProcessResult = {
  processed: number;
  skipped: number;
  releasedProjects: {
    projectId: string;
    title: string;
    clientName: string;
    reviewDueAt: string | null;
    txHash: string;
  }[];
  skippedProjects: {
    projectId: string;
    title: string;
    clientName: string;
    reviewDueAt: string | null;
    reason: string;
  }[];
};

export async function processReviewTimeouts(): Promise<ProcessResult> {
  const now = new Date();

  const projects = await prisma.project.findMany({
    where: {
      status: "DRAFT_SUBMITTED",
      reviewDueAt: { lt: now },
      escrowAddress: { not: null },
      escrowPaused: false,
    },
    include: {
      admin: true,
      client: {
        select: { name: true },
      },
      payments: {
        where: {
          status: "COMPLETED",
          type: { in: ["DEPOSIT", "BALANCE"] },
        },
        select: {
          type: true,
        },
      },
    },
  });

  let processed = 0;
  let skipped = 0;
  const releasedProjects: ProcessResult["releasedProjects"] = [];
  const skippedProjects: ProcessResult["skippedProjects"] = [];

  for (const project of projects) {
    const hasDepositPayment = project.payments.some(
      (payment) => payment.type === "DEPOSIT"
    );
    if (!hasDepositPayment) {
      skipped += 1;
      skippedProjects.push({
        projectId: project.id,
        title: project.title,
        clientName: project.client.name,
        reviewDueAt: project.reviewDueAt?.toISOString() ?? null,
        reason: "Project has no completed deposit payment to release.",
      });
      continue;
    }

    if (!project.escrowAddress) {
      skipped += 1;
      skippedProjects.push({
        projectId: project.id,
        title: project.title,
        clientName: project.client.name,
        reviewDueAt: project.reviewDueAt?.toISOString() ?? null,
        reason: "Missing escrow contract address.",
      });
      continue;
    }
    if (!project.admin || !project.admin.walletPrivateKey) {
      skipped += 1;
      skippedProjects.push({
        projectId: project.id,
        title: project.title,
        clientName: project.client.name,
        reviewDueAt: project.reviewDueAt?.toISOString() ?? null,
        reason: "Assigned admin does not have a funded wallet.",
      });
      continue;
    }

    try {
      const tx = await releaseEscrow(
        project.escrowAddress,
        project.admin.walletPrivateKey
      );
      const hasBalancePayment = project.payments.some(
        (payment) => payment.type === "BALANCE"
      );
      const releasedAmount = hasBalancePayment
        ? project.quotedAmount
        : project.depositAmount;

      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: "RELEASED",
          timeline: {
            create: {
              actorId: project.adminId,
              eventType: "REVIEW_EXPIRED_RELEASED",
              message: "Review window elapsed. Funds released automatically.",
              txHash: tx.hash,
            },
          },
          payments: {
            create: {
              type: "RELEASE",
              status: "COMPLETED",
              amount: releasedAmount,
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

      await prisma.notification.create({
        data: {
          userId: project.clientId,
          title: "Automatic release",
          message: `Review window elapsed for \"${project.title}\". Funds released.`,
        },
      });

      processed += 1;
      releasedProjects.push({
        projectId: project.id,
        title: project.title,
        clientName: project.client.name,
        reviewDueAt: project.reviewDueAt?.toISOString() ?? null,
        txHash: tx.hash,
      });
    } catch (error) {
      console.error("Review timeout failed:", error);
      skipped += 1;
      skippedProjects.push({
        projectId: project.id,
        title: project.title,
        clientName: project.client.name,
        reviewDueAt: project.reviewDueAt?.toISOString() ?? null,
        reason: "On-chain release transaction failed.",
      });
    }
  }

  return { processed, skipped, releasedProjects, skippedProjects };
}
