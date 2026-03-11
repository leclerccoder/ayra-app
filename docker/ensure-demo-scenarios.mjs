import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { ethers } from "ethers";
import escrowArtifact from "../src/contracts/escrow.json" with { type: "json" };

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";
const DEMO_CLIENT_ID = "demo_review_client";
const DEMO_DESIGNER_ID = "demo_review_designer";
const DEMO_ENQUIRY_ID = "demo_review_enquiry";
const DEMO_PROJECT_ID = "demo_review_project";
const DEMO_DRAFT_ID = "demo_review_draft";
const DEMO_TIMELINE_IDS = {
  projectCreated: "demo_review_timeline_created",
  depositFunded: "demo_review_timeline_deposit",
  draftSubmitted: "demo_review_timeline_draft",
};
const DEMO_PAYMENT_IDS = {
  deposit: "demo_review_payment_deposit",
  balance: "demo_review_payment_balance",
};

const REVIEW_TIMEOUT_WINDOW_DAYS = 2;
const rpcUrl = process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545";
const chainId = Number(process.env.CHAIN_ID ?? "31337");

function getProvider() {
  return new ethers.JsonRpcProvider(rpcUrl, chainId);
}

function createLocalWalletRecord() {
  const wallet = ethers.Wallet.createRandom();
  return {
    walletPrivateKey: wallet.privateKey,
    walletAddress: wallet.address,
  };
}

async function ensureWalletBalance(privateKey, minimumEth = "0.5", topUpEth = "2.0") {
  const provider = getProvider();
  const wallet = new ethers.Wallet(privateKey, provider);
  const balance = await provider.getBalance(wallet.address);
  if (balance >= ethers.parseEther(minimumEth)) {
    return;
  }

  const funderKey = process.env.CHAIN_FUNDER_PRIVATE_KEY;
  if (!funderKey) {
    throw new Error("CHAIN_FUNDER_PRIVATE_KEY is not set.");
  }

  const funder = new ethers.Wallet(funderKey, provider);
  const tx = await funder.sendTransaction({
    to: wallet.address,
    value: ethers.parseEther(topUpEth),
  });
  await tx.wait();
}

async function ensureAdminUser() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
  });

  if (!existingAdmin) {
    const wallet = createLocalWalletRecord();
    await ensureWalletBalance(wallet.walletPrivateKey);
    return prisma.user.create({
      data: {
        id: "demo_review_admin",
        name: "Ayra Demo Admin",
        email: "admin@ayra.local",
        passwordHash,
        role: "ADMIN",
        emailVerified: true,
        ...wallet,
      },
    });
  }

  if (existingAdmin.walletPrivateKey && existingAdmin.walletAddress) {
    await ensureWalletBalance(existingAdmin.walletPrivateKey);
    return existingAdmin;
  }

  const wallet = createLocalWalletRecord();
  await ensureWalletBalance(wallet.walletPrivateKey);
  return prisma.user.update({
    where: { id: existingAdmin.id },
    data: wallet,
  });
}

async function upsertDemoUser(params) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  const wallet =
    existing?.walletPrivateKey && existing.walletAddress
      ? {
          walletPrivateKey: existing.walletPrivateKey,
          walletAddress: existing.walletAddress,
        }
      : createLocalWalletRecord();

  await ensureWalletBalance(wallet.walletPrivateKey);

  const data = {
    name: params.name,
    email: params.email,
    passwordHash,
    role: params.role,
    emailVerified: true,
    ...wallet,
  };

  if (existing) {
    return prisma.user.update({
      where: { id: params.id },
      data,
    });
  }

  return prisma.user.create({
    data: {
      id: params.id,
      ...data,
    },
  });
}

async function writeDemoDraftFile() {
  const dir = path.join(process.cwd(), "public", "uploads", "drafts");
  await fs.mkdir(dir, { recursive: true });
  const fileName = "review-timeout-demo.txt";
  const filePath = path.join(dir, fileName);
  const contents = [
    "Ayra Review Timeout Demo",
    "",
    "Project: Horizon Loft Review Timeout",
    "Purpose: Demonstrate automatic escrow release after the client review window expires.",
    "",
    "This draft is intentionally left in review to populate the admin timeout queue.",
  ].join("\n");
  await fs.writeFile(filePath, contents, "utf8");
  const sha256 = crypto.createHash("sha256").update(contents).digest("hex");
  return {
    fileUrl: "/uploads/drafts/review-timeout-demo.txt",
    fileName: "Horizon-Loft-Concept.txt",
    sha256,
  };
}

async function deployReviewTimeoutEscrow(params) {
  const companyKey = process.env.COMPANY_WALLET_PRIVATE_KEY;
  if (!companyKey) {
    throw new Error("COMPANY_WALLET_PRIVATE_KEY is not set.");
  }

  const provider = getProvider();
  const adminWallet = new ethers.NonceManager(
    new ethers.Wallet(params.adminPrivateKey, provider)
  );
  const adminAddress = await adminWallet.getAddress();
  const companyWallet = new ethers.Wallet(companyKey, provider);
  const factory = new ethers.ContractFactory(
    escrowArtifact.abi,
    escrowArtifact.bytecode,
    adminWallet
  );

  const contract = await factory.deploy(
    params.clientAddress,
    companyWallet.address,
    adminAddress,
    ethers.parseEther(params.depositAmount),
    ethers.parseEther(params.balanceAmount)
  );
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const escrow = new ethers.Contract(address, escrowArtifact.abi, adminWallet);
  const depositTx = await escrow.recordDepositFiat();
  await depositTx.wait();
  const balanceTx = await escrow.recordBalanceFiat();
  await balanceTx.wait();

  return {
    escrowAddress: address,
    depositTxHash: depositTx.hash,
    balanceTxHash: balanceTx.hash,
  };
}

async function removeExistingDemoScenario() {
  await prisma.$transaction([
    prisma.notification.deleteMany({
      where: {
        userId: DEMO_CLIENT_ID,
      },
    }),
    prisma.chainEvent.deleteMany({ where: { projectId: DEMO_PROJECT_ID } }),
    prisma.timelineEvent.deleteMany({ where: { projectId: DEMO_PROJECT_ID } }),
    prisma.payment.deleteMany({ where: { projectId: DEMO_PROJECT_ID } }),
    prisma.dispute.deleteMany({ where: { projectId: DEMO_PROJECT_ID } }),
    prisma.draft.deleteMany({ where: { projectId: DEMO_PROJECT_ID } }),
    prisma.project.deleteMany({ where: { id: DEMO_PROJECT_ID } }),
    prisma.enquiry.deleteMany({ where: { id: DEMO_ENQUIRY_ID } }),
  ]);
}

async function ensureReviewTimeoutScenario() {
  const admin = await ensureAdminUser();
  const client = await upsertDemoUser({
    id: DEMO_CLIENT_ID,
    name: "Review Demo Client",
    email: "client.review-demo@ayra.local",
    role: "CLIENT",
  });
  const designer = await upsertDemoUser({
    id: DEMO_DESIGNER_ID,
    name: "Review Demo Designer",
    email: "designer.review-demo@ayra.local",
    role: "DESIGNER",
  });
  const draftFile = await writeDemoDraftFile();
  const quotedAmount = "18000.00";
  const depositAmount = "9000.00";
  const balanceAmount = "9000.00";
  const reviewDueAt = new Date();
  reviewDueAt.setDate(reviewDueAt.getDate() - REVIEW_TIMEOUT_WINDOW_DAYS);

  const escrow = await deployReviewTimeoutEscrow({
    clientAddress: client.walletAddress,
    adminPrivateKey: admin.walletPrivateKey,
    depositAmount,
    balanceAmount,
  });

  await removeExistingDemoScenario();

  await prisma.enquiry.create({
    data: {
      id: DEMO_ENQUIRY_ID,
      clientId: client.id,
      status: "PROJECT_CREATED",
      fullName: client.name,
      contactEmail: client.email,
      contactPhone: "012-0000000",
      serviceType: "Interior makeover",
      addressLine: "88 Jalan Horizon",
      propertyType: "Loft apartment",
      propertySize: "1,450 sqft",
      state: "Selangor",
      area: "Subang Jaya",
      budgetRange: "RM 15k - 20k",
      preferredStyle: "Modern industrial",
      notes:
        "Demo enquiry used to show how the review timeout automation releases escrow after the deadline passes.",
    },
  });

  await prisma.project.create({
    data: {
      id: DEMO_PROJECT_ID,
      enquiryId: DEMO_ENQUIRY_ID,
      clientId: client.id,
      designerId: designer.id,
      adminId: admin.id,
      title: "Horizon Loft Review Timeout",
      quotedAmount,
      depositAmount,
      balanceAmount,
      status: "DRAFT_SUBMITTED",
      escrowAddress: escrow.escrowAddress,
      chainId,
      reviewDueAt,
      drafts: {
        create: [
          {
            id: DEMO_DRAFT_ID,
            uploadedById: designer.id,
            fileName: draftFile.fileName,
            fileUrl: draftFile.fileUrl,
            sha256: draftFile.sha256,
            status: "SUBMITTED",
          },
        ],
      },
      payments: {
        create: [
          {
            id: DEMO_PAYMENT_IDS.deposit,
            type: "DEPOSIT",
            status: "COMPLETED",
            amount: depositAmount,
            txHash: escrow.depositTxHash,
            metadata: {
              mode: "FIAT",
              provider: "MOCK",
              method: "FPX",
              reference: "MOCK-DEPOSIT-REVIEW-TIMEOUT",
            },
          },
          {
            id: DEMO_PAYMENT_IDS.balance,
            type: "BALANCE",
            status: "COMPLETED",
            amount: balanceAmount,
            txHash: escrow.balanceTxHash,
            metadata: {
              mode: "FIAT",
              provider: "MOCK",
              method: "VISA",
              reference: "MOCK-BALANCE-REVIEW-TIMEOUT",
            },
          },
        ],
      },
      timeline: {
        create: [
          {
            id: DEMO_TIMELINE_IDS.projectCreated,
            actorId: admin.id,
            eventType: "PROJECT_CREATED",
            message: "Demo project created to show review timeout automation.",
          },
          {
            id: DEMO_TIMELINE_IDS.depositFunded,
            actorId: client.id,
            eventType: "DEPOSIT_FUNDED",
            message: "Client funded the deposit via the local fiat demo flow.",
            txHash: escrow.depositTxHash,
          },
          {
            id: DEMO_TIMELINE_IDS.draftSubmitted,
            actorId: designer.id,
            eventType: "DRAFT_SUBMITTED",
            message:
              "Designer submitted the concept draft. Review deadline intentionally set in the past for admin demo.",
            txHash: escrow.balanceTxHash,
          },
        ],
      },
    },
  });

  console.log(
    `Review timeout demo project is ready: Horizon Loft Review Timeout (${escrow.escrowAddress})`
  );
}

async function main() {
  await ensureReviewTimeoutScenario();
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
