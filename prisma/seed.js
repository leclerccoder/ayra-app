const { PrismaClient, Prisma } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const prisma = new PrismaClient();

const SEED_IDS = {
  admin: "seed_admin",
  designer: "seed_designer",
  client: "seed_client",
  enquiry: "seed_enquiry_1",
  project: "seed_project_1",
  draft: "seed_draft_1",
  timeline: [
    "seed_timeline_1",
    "seed_timeline_2",
    "seed_timeline_3",
    "seed_timeline_4",
    "seed_timeline_5",
  ],
  payments: ["seed_payment_1", "seed_payment_2", "seed_payment_3"],
  chainEvents: ["seed_chain_1", "seed_chain_2", "seed_chain_3"],
  notifications: [
    "seed_notification_1",
    "seed_notification_2",
    "seed_notification_3",
  ],
};

const SEED_PASSWORD = "Password123!";

async function writeDraftFile() {
  const dir = path.join(process.cwd(), "public", "uploads", "drafts");
  await fs.mkdir(dir, { recursive: true });
  const fileName = "seed-draft.txt";
  const filePath = path.join(dir, fileName);
  const contents = [
    "Ayra Demo Draft",
    "",
    "Project: The Haven Residence",
    "Deliverable: Concept moodboard + layout notes",
    "",
    "This file is seeded for the portal UI demo.",
  ].join("\n");
  await fs.writeFile(filePath, contents, "utf8");
  const sha256 = crypto.createHash("sha256").update(contents).digest("hex");
  return {
    url: `/uploads/drafts/${fileName}`,
    sha256,
    displayName: "Ayra-Concept-Board.txt",
  };
}

async function cleanupSeedData() {
  await prisma.$transaction([
    prisma.session.deleteMany({
      where: { userId: { in: [SEED_IDS.admin, SEED_IDS.designer, SEED_IDS.client] } },
    }),
    prisma.notification.deleteMany({
      where: { id: { startsWith: "seed_" } },
    }),
    prisma.chainEvent.deleteMany({
      where: { id: { startsWith: "seed_" } },
    }),
    prisma.timelineEvent.deleteMany({
      where: { id: { startsWith: "seed_" } },
    }),
    prisma.payment.deleteMany({
      where: { id: { startsWith: "seed_" } },
    }),
    prisma.dispute.deleteMany({
      where: { id: { startsWith: "seed_" } },
    }),
    prisma.draft.deleteMany({
      where: { id: { startsWith: "seed_" } },
    }),
    prisma.project.deleteMany({
      where: { id: { startsWith: "seed_" } },
    }),
    prisma.enquiry.deleteMany({
      where: { id: { startsWith: "seed_" } },
    }),
    prisma.user.deleteMany({
      where: { id: { in: [SEED_IDS.admin, SEED_IDS.designer, SEED_IDS.client] } },
    }),
  ]);
}

async function seed() {
  await cleanupSeedData();

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  const draftFile = await writeDraftFile();

  await prisma.user.createMany({
    data: [
      {
        id: SEED_IDS.admin,
        name: "Ayra Admin",
        email: "admin@ayra.local",
        passwordHash,
        role: "ADMIN",
      },
      {
        id: SEED_IDS.designer,
        name: "Dina Designer",
        email: "designer@ayra.local",
        passwordHash,
        role: "DESIGNER",
      },
      {
        id: SEED_IDS.client,
        name: "Chris Client",
        email: "client@ayra.local",
        passwordHash,
        role: "CLIENT",
      },
    ],
  });

  await prisma.enquiry.create({
    data: {
      id: SEED_IDS.enquiry,
      clientId: SEED_IDS.client,
      status: "PROJECT_CREATED",
      fullName: "Chris Client",
      contactEmail: "client@ayra.local",
      contactPhone: "012-3456789",
      serviceType: "Interior renovation",
      addressLine: "12 Jalan Example",
      propertyType: "Condominium",
      propertySize: "1,200 sqft",
      state: "Selangor",
      area: "Petaling Jaya",
      budgetRange: "RM 60k - 80k",
      preferredStyle: "Modern warm",
      notes: "Looking to refresh the living room and kitchen layout.",
    },
  });

  const quotedAmount = new Prisma.Decimal("12000.00");
  const depositAmount = quotedAmount.mul(new Prisma.Decimal("0.5"));
  const balanceAmount = quotedAmount.minus(depositAmount);
  const reviewDueAt = new Date();
  reviewDueAt.setDate(reviewDueAt.getDate() - 2);

  await prisma.project.create({
    data: {
      id: SEED_IDS.project,
      enquiryId: SEED_IDS.enquiry,
      clientId: SEED_IDS.client,
      designerId: SEED_IDS.designer,
      adminId: SEED_IDS.admin,
      title: "The Haven Residence",
      quotedAmount,
      depositAmount,
      balanceAmount,
      status: "RELEASED",
      escrowAddress: "0x1000000000000000000000000000000000000001",
      chainId: 31337,
      reviewDueAt,
      drafts: {
        create: [
          {
            id: SEED_IDS.draft,
            uploadedById: SEED_IDS.designer,
            fileName: draftFile.displayName,
            fileUrl: draftFile.url,
            sha256: draftFile.sha256,
            status: "APPROVED",
          },
        ],
      },
      payments: {
        create: [
          {
            id: SEED_IDS.payments[0],
            type: "DEPOSIT",
            status: "COMPLETED",
            amount: depositAmount,
            txHash:
              "0x7f25f9f0b0e7c77fe68b1ac3b64c9f7c58c2b2c7d1d5085e9b0b8c3c9f6a1f01",
          },
          {
            id: SEED_IDS.payments[1],
            type: "BALANCE",
            status: "COMPLETED",
            amount: balanceAmount,
            txHash:
              "0x2df390d5c3bd7ac6b5a3e9f0b2c7e0d7f1c8a3b0c4d5e6f7a8b9c0d1e2f3a4b5",
          },
          {
            id: SEED_IDS.payments[2],
            type: "RELEASE",
            status: "COMPLETED",
            amount: quotedAmount,
            txHash:
              "0x9c2d8f73e2b4a6f0193c5d7e1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b",
          },
        ],
      },
      timeline: {
        create: [
          {
            id: SEED_IDS.timeline[0],
            actorId: SEED_IDS.admin,
            eventType: "PROJECT_CREATED",
            message: "Project created from enquiry.",
          },
          {
            id: SEED_IDS.timeline[1],
            actorId: SEED_IDS.client,
            eventType: "DEPOSIT_FUNDED",
            message: "Client funded the 50% deposit.",
          },
          {
            id: SEED_IDS.timeline[2],
            actorId: SEED_IDS.designer,
            eventType: "DRAFT_SUBMITTED",
            message: "Draft deliverable uploaded.",
            metadata: { hash: draftFile.sha256 },
          },
          {
            id: SEED_IDS.timeline[3],
            actorId: SEED_IDS.client,
            eventType: "DRAFT_APPROVED",
            message: "Client approved the draft and funded the balance.",
          },
          {
            id: SEED_IDS.timeline[4],
            actorId: SEED_IDS.admin,
            eventType: "FUNDS_RELEASED",
            message: "Admin released escrow funds to the company.",
          },
        ],
      },
      chainEvents: {
        create: [
          {
            id: SEED_IDS.chainEvents[0],
            eventName: "DepositFunded",
            txHash:
              "0x1a4c9e7b3f6d2c8a1f9e7b6c5d4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a",
            payload: { amount: depositAmount.toString() },
          },
          {
            id: SEED_IDS.chainEvents[1],
            eventName: "BalanceFunded",
            txHash:
              "0x4b2a1f0e9d8c7b6a5f4e3d2c1b0a9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f",
            payload: { amount: balanceAmount.toString() },
          },
          {
            id: SEED_IDS.chainEvents[2],
            eventName: "FundsReleased",
            txHash:
              "0x8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e",
          },
        ],
      },
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        id: SEED_IDS.notifications[0],
        userId: SEED_IDS.client,
        title: "Welcome to Ayra",
        message: "Your client portal is ready. Track projects and escrow updates here.",
        status: "UNREAD",
      },
      {
        id: SEED_IDS.notifications[1],
        userId: SEED_IDS.client,
        title: "Draft approved",
        message: "Your draft was approved and the balance payment is on record.",
        status: "READ",
        readAt: new Date(),
      },
      {
        id: SEED_IDS.notifications[2],
        userId: SEED_IDS.client,
        title: "Escrow released",
        message: "Escrow funds have been released to the company.",
        status: "UNREAD",
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Login credentials:");
  console.log("Client: client@ayra.local / Password123!");
  console.log("Designer: designer@ayra.local / Password123!");
  console.log("Admin: admin@ayra.local / Password123!");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
