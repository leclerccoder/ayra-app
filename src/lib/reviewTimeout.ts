import { prisma } from "@/lib/db";
import { ethers } from "ethers";
import escrow from "@/contracts/escrow.json";

type ProcessResult = {
  processed: number;
  skipped: number;
};

export async function processReviewTimeouts(): Promise<ProcessResult> {
  const rpcUrl = process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const now = new Date();

  const projects = await prisma.project.findMany({
    where: {
      status: "DRAFT_SUBMITTED",
      reviewDueAt: { lt: now },
      escrowAddress: { not: null },
      escrowPaused: false,
    },
    include: { admin: true },
  });

  let processed = 0;
  let skipped = 0;

  for (const project of projects) {
    if (!project.escrowAddress) {
      skipped += 1;
      continue;
    }
    if (!project.admin || !project.admin.walletPrivateKey) {
      skipped += 1;
      continue;
    }

    try {
      const adminWallet = new ethers.Wallet(
        project.admin.walletPrivateKey,
        provider
      );
      const contract = new ethers.Contract(
        project.escrowAddress,
        escrow.abi,
        adminWallet
      );

      const tx = await contract.releaseToCompany();
      await tx.wait();

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

      await prisma.notification.create({
        data: {
          userId: project.clientId,
          title: "Automatic release",
          message: `Review window elapsed for \"${project.title}\". Funds released.`,
        },
      });

      processed += 1;
    } catch (error) {
      console.error("Review timeout failed:", error);
      skipped += 1;
    }
  }

  return { processed, skipped };
}
