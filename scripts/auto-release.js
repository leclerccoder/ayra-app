const { PrismaClient } = require("@prisma/client");
const { ethers } = require("ethers");
const escrow = require("../src/contracts/escrow.json");

const prisma = new PrismaClient();

async function main() {
  const rpcUrl = process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const now = new Date();

  const projects = await prisma.project.findMany({
    where: {
      status: "DRAFT_SUBMITTED",
      reviewDueAt: { lt: now },
      escrowAddress: { not: null },
    },
    include: { admin: true },
  });

  for (const project of projects) {
    if (!project.admin || !project.admin.walletPrivateKey) {
      continue;
    }

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
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
