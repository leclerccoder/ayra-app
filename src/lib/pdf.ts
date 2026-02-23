import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { PassThrough } from "node:stream";

export async function renderPdf(build: (doc: any) => void): Promise<Uint8Array> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  doc.pipe(stream);
  build(doc);
  doc.end();

  return await new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
