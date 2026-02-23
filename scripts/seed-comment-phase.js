const { PrismaClient, Prisma } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const prisma = new PrismaClient();

const IDS = {
  admin: "comment_seed_admin",
  designer: "comment_seed_designer",
  client: "comment_seed_client",
  enquiry: "comment_seed_enquiry_1",
  project: "comment_seed_project_1",
  draft: "comment_seed_draft_1",
  comments: [
    "comment_seed_comment_1",
    "comment_seed_comment_2",
    "comment_seed_comment_3",
  ],
  timeline: [
    "comment_seed_timeline_1",
    "comment_seed_timeline_2",
    "comment_seed_timeline_3",
  ],
  payment: "comment_seed_payment_1",
  chainEvent: "comment_seed_chain_1",
};

const PASSWORD = "Password123!";

async function writeDraftFile() {
  const dir = path.join(process.cwd(), "public", "uploads", "drafts");
  await fs.mkdir(dir, { recursive: true });
  const fileName = "comment-seed-draft.txt";
  const filePath = path.join(dir, fileName);

  const contents = [
    "Ayra Draft Discussion Seed",
    "",
    "Project: Cozy Studio Revamp",
    "Scope: Moodboard v1 + furniture placement",
    "",
    "Use this file to test the draft comment feature.",
  ].join("\n");

  await fs.writeFile(filePath, contents, "utf8");

  return {
    fileName: "CozyStudio-Draft-v1.txt",
    fileUrl: `/uploads/drafts/${fileName}`,
    sha256: crypto.createHash("sha256").update(contents).digest("hex"),
  };
}

async function cleanup() {
  await prisma.$transaction([
    prisma.session.deleteMany({
      where: {
        userId: {
          in: [IDS.admin, IDS.designer, IDS.client],
        },
      },
    }),
    prisma.notification.deleteMany({
      where: {
        userId: {
          in: [IDS.admin, IDS.designer, IDS.client],
        },
      },
    }),
    prisma.draftComment.deleteMany({
      where: {
        id: {
          startsWith: "comment_seed_",
        },
      },
    }),
    prisma.chainEvent.deleteMany({
      where: {
        id: {
          startsWith: "comment_seed_",
        },
      },
    }),
    prisma.timelineEvent.deleteMany({
      where: {
        id: {
          startsWith: "comment_seed_",
        },
      },
    }),
    prisma.payment.deleteMany({
      where: {
        id: {
          startsWith: "comment_seed_",
        },
      },
    }),
    prisma.disputeFile.deleteMany({
      where: {
        dispute: {
          projectId: IDS.project,
        },
      },
    }),
    prisma.dispute.deleteMany({
      where: {
        projectId: IDS.project,
      },
    }),
    prisma.draft.deleteMany({
      where: {
        id: {
          startsWith: "comment_seed_",
        },
      },
    }),
    prisma.project.deleteMany({
      where: {
        id: IDS.project,
      },
    }),
    prisma.enquiry.deleteMany({
      where: {
        id: IDS.enquiry,
      },
    }),
    prisma.user.deleteMany({
      where: {
        id: {
          in: [IDS.admin, IDS.designer, IDS.client],
        },
      },
    }),
  ]);
}

async function seed() {
  await cleanup();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const draftFile = await writeDraftFile();

  await prisma.user.createMany({
    data: [
      {
        id: IDS.admin,
        name: "Comment Admin",
        email: "comment.admin@ayra.local",
        passwordHash,
        role: "ADMIN",
        emailVerified: true,
      },
      {
        id: IDS.designer,
        name: "Comment Designer",
        email: "comment.designer@ayra.local",
        passwordHash,
        role: "DESIGNER",
        emailVerified: true,
      },
      {
        id: IDS.client,
        name: "Comment Client",
        email: "comment.client@ayra.local",
        passwordHash,
        role: "CLIENT",
        emailVerified: true,
      },
    ],
  });

  await prisma.enquiry.create({
    data: {
      id: IDS.enquiry,
      clientId: IDS.client,
      status: "PROJECT_CREATED",
      fullName: "Comment Client",
      contactEmail: "comment.client@ayra.local",
      contactPhone: "012-9990001",
      serviceType: "Interior design consultation",
      addressLine: "88 Jalan Testing",
      propertyType: "Studio apartment",
      propertySize: "650 sqft",
      state: "Selangor",
      area: "Subang Jaya",
      budgetRange: "RM 20k - 30k",
      preferredStyle: "Soft minimal",
      notes: "Need practical layout and warm color palette.",
    },
  });

  const quotedAmount = new Prisma.Decimal("8000.00");
  const depositAmount = quotedAmount.mul(new Prisma.Decimal("0.5"));
  const balanceAmount = quotedAmount.minus(depositAmount);

  const now = new Date();
  const submittedAt = new Date(now.getTime() - 1000 * 60 * 20);
  const comment1At = new Date(now.getTime() - 1000 * 60 * 10);
  const comment2At = new Date(now.getTime() - 1000 * 60 * 6);
  const comment3At = new Date(now.getTime() - 1000 * 60 * 2);
  const reviewDueAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5);

  await prisma.project.create({
    data: {
      id: IDS.project,
      enquiryId: IDS.enquiry,
      clientId: IDS.client,
      designerId: IDS.designer,
      adminId: IDS.admin,
      title: "Comment Feature Test Project",
      quotedAmount,
      depositAmount,
      balanceAmount,
      status: "DRAFT_SUBMITTED",
      escrowAddress: "0x2000000000000000000000000000000000000002",
      chainId: 31337,
      reviewDueAt,
      drafts: {
        create: [
          {
            id: IDS.draft,
            uploadedById: IDS.designer,
            fileName: draftFile.fileName,
            fileUrl: draftFile.fileUrl,
            sha256: draftFile.sha256,
            status: "SUBMITTED",
            createdAt: submittedAt,
            comments: {
              create: [
                {
                  id: IDS.comments[0],
                  authorId: IDS.designer,
                  message:
                    "Hi, this is draft v1. Please review the color direction and furniture layout.",
                  createdAt: comment1At,
                },
                {
                  id: IDS.comments[1],
                  authorId: IDS.client,
                  message:
                    "Looks good overall. Can we make the TV wall lighter and add more storage near the entrance?",
                  createdAt: comment2At,
                },
                {
                  id: IDS.comments[2],
                  authorId: IDS.admin,
                  message:
                    "Good feedback. Please confirm revised version here before final approval.",
                  createdAt: comment3At,
                },
              ],
            },
          },
        ],
      },
      payments: {
        create: [
          {
            id: IDS.payment,
            type: "DEPOSIT",
            status: "COMPLETED",
            amount: depositAmount,
            txHash:
              "0x1111111111111111111111111111111111111111111111111111111111111111",
            metadata: {
              mode: "FIAT",
              provider: "ToyyibPay (Demo)",
              method: "FPX",
              reference: "COMMENT-SEED-DEP-001",
            },
          },
        ],
      },
      timeline: {
        create: [
          {
            id: IDS.timeline[0],
            actorId: IDS.admin,
            eventType: "PROJECT_CREATED",
            message: "Project created for draft discussion testing.",
          },
          {
            id: IDS.timeline[1],
            actorId: IDS.client,
            eventType: "DEPOSIT_FUNDED",
            message: "Client funded deposit for the project.",
          },
          {
            id: IDS.timeline[2],
            actorId: IDS.designer,
            eventType: "DRAFT_SUBMITTED",
            message: "Designer submitted draft for review and comments.",
            metadata: {
              hash: draftFile.sha256,
            },
          },
        ],
      },
      chainEvents: {
        create: [
          {
            id: IDS.chainEvent,
            eventName: "DepositFunded",
            txHash:
              "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            payload: {
              amount: depositAmount.toString(),
            },
          },
        ],
      },
    },
  });

  console.log("Comment-phase seed complete.");
  console.log("Project ID:", IDS.project);
  console.log("Open:", `/portal/projects/${IDS.project}`);
  console.log("Logins:");
  console.log("Client: comment.client@ayra.local / Password123!");
  console.log("Designer: comment.designer@ayra.local / Password123!");
  console.log("Admin: comment.admin@ayra.local / Password123!");
}

seed()
  .catch((error) => {
    console.error("Comment-phase seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
