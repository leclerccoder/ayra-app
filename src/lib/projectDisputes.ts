import { z } from "zod";
import { prisma } from "@/lib/db";
import { notifyAdmins } from "@/lib/notifications";
import { saveUploadedFile } from "@/lib/storage";
import { getSanitizedFormText } from "@/lib/inputSecurity";

const disputeSchema = z.object({
  projectId: z.string().min(1),
  description: z.string().min(10, "Describe the dispute in at least 10 characters."),
});

export async function openProjectDispute(userId: string, formData: FormData) {
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
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
  });

  if (!project) {
    throw new Error("Project not found.");
  }

  if (project.clientId !== userId) {
    throw new Error("Only the client can open a dispute.");
  }

  if (project.status !== "DRAFT_SUBMITTED" && project.status !== "APPROVED") {
    throw new Error("Dispute can only be opened after draft submission.");
  }

  const existingOpenDispute = await prisma.dispute.findFirst({
    where: {
      projectId: project.id,
      status: "OPEN",
    },
    select: { id: true },
  });

  if (existingOpenDispute) {
    throw new Error("A dispute is already open for this project.");
  }

  const evidenceFiles = formData
    .getAll("evidenceFiles")
    .filter((file): file is File => file instanceof File && file.size > 0);

  const storedEvidence = await Promise.all(
    evidenceFiles.map((file) => saveUploadedFile(file, "disputes"))
  );

  await prisma.$transaction(async (tx) => {
    const claimProject = await tx.project.updateMany({
      where: {
        id: project.id,
        clientId: userId,
        status: {
          in: ["DRAFT_SUBMITTED", "APPROVED"],
        },
      },
      data: {
        status: "DISPUTED",
      },
    });

    if (claimProject.count === 0) {
      const currentProject = await tx.project.findUnique({
        where: { id: project.id },
        select: { status: true },
      });
      if (currentProject?.status === "DISPUTED") {
        throw new Error("A dispute is already open for this project.");
      }
      throw new Error("Dispute can only be opened after draft submission.");
    }

    const dispute = await tx.dispute.create({
      data: {
        projectId: project.id,
        openedById: userId,
        description: parsed.data.description,
      },
    });

    await tx.timelineEvent.create({
      data: {
        projectId: project.id,
        actorId: userId,
        eventType: "DISPUTE_OPENED",
        message: "Client opened a dispute.",
      },
    });

    if (storedEvidence.length > 0) {
      await tx.disputeFile.createMany({
        data: storedEvidence.map((file) => ({
          disputeId: dispute.id,
          uploadedById: userId,
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

  return { projectId: project.id };
}
