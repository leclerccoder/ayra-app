import { prisma } from "@/lib/db";
import { renderPdf } from "@/lib/pdf";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const ip = getClientIp(request);
  if (!rateLimit(`receipt-arb:${ip}`, 10, 60_000)) {
    return new Response("Too many requests", { status: 429 });
  }

  const { projectId } = await context.params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      disputes: {
        orderBy: { createdAt: "desc" },
        include: { openedBy: true, decidedBy: true },
      },
    },
  });

  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  const dispute = project.disputes[0];
  if (!dispute) {
    return new Response("No dispute found", { status: 404 });
  }

  const pdf = await renderPdf((doc) => {
    doc.fontSize(18).text("Ayra Design Arbitration Summary");
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Project: ${project.title}`);
    doc.text(`Project ID: ${project.id}`);
    doc.text(`Client: ${project.client.name} (${project.client.email})`);
    doc.moveDown();
    doc.text("Dispute Details:", { underline: true });
    doc.fontSize(11).text(`Opened by: ${dispute.openedBy.name}`);
    doc.text(`Opened on: ${dispute.createdAt.toDateString()}`);
    doc.moveDown(0.5);
    doc.fontSize(11).text(dispute.description);
    doc.moveDown();
    doc.text("Decision:", { underline: true });
    doc.fontSize(11).text(`Outcome: ${dispute.decision ?? "Pending"}`);
    if (dispute.clientPercent || dispute.companyPercent) {
      doc.text(
        `Split: ${dispute.clientPercent ?? 0}% client / ${
          dispute.companyPercent ?? 0
        }% company`
      );
    }
    if (dispute.decidedBy) {
      doc.text(`Decided by: ${dispute.decidedBy.name}`);
    }
    if (dispute.decisionNote) {
      doc.text(`Notes: ${dispute.decisionNote}`);
    }
  });

  const pdfBuffer = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(pdfBuffer).set(pdf);
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"ayra-arbitration-${project.id}.pdf\"`,
    },
  });
}
