import { prisma } from "@/lib/db";
import { renderPdf } from "@/lib/pdf";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

type ReceiptPayment = {
  createdAt: Date;
  type: string;
  amount: { toString(): string };
  status: string;
  txHash: string | null;
};

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const ip = getClientIp(request);
  if (!rateLimit(`receipt:${ip}`, 20, 60_000)) {
    return new Response("Too many requests", { status: 429 });
  }

  const { projectId } = await context.params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      payments: { orderBy: { createdAt: "asc" } },
      disputes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) {
    return new Response("Project not found", { status: 404 });
  }

  const pdf = await renderPdf((doc) => {
    doc.fontSize(18).text("Ayra Design Escrow Receipt");
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Project: ${project.title}`);
    doc.text(`Project ID: ${project.id}`);
    doc.text(`Client: ${project.client.name} (${project.client.email})`);
    doc.text(`Status: ${project.status}`);
    doc.moveDown();
    doc.text(`Quoted Amount: RM ${project.quotedAmount.toString()}`);
    doc.text(`Deposit (50%): RM ${project.depositAmount.toString()}`);
    doc.text(`Balance (50%): RM ${project.balanceAmount.toString()}`);
    doc.moveDown();
    doc.text("Payment History:", { underline: true });
    const payments = project.payments as ReceiptPayment[];
    payments.forEach((payment) => {
      doc
        .fontSize(11)
        .text(
          `${payment.createdAt.toDateString()} · ${payment.type} · RM ${payment.amount.toString()} · ${payment.status}`
        );
      if (payment.txHash) {
        doc.fontSize(9).text(`Tx: ${payment.txHash}`);
      }
    });
    doc.moveDown();
    const dispute = project.disputes[0];
    if (dispute) {
      doc.fontSize(12).text("Latest Dispute:", { underline: true });
      doc.fontSize(11).text(`Status: ${dispute.status}`);
      doc.fontSize(11).text(`Decision: ${dispute.decision ?? "Pending"}`);
      if (dispute.decisionNote) {
        doc.fontSize(10).text(`Note: ${dispute.decisionNote}`);
      }
    }
  });

  const pdfBuffer = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(pdfBuffer).set(pdf);
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ayra-receipt-${project.id}.pdf"`,
    },
  });
}
