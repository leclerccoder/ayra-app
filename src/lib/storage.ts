import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export async function saveUploadedFile(
  file: File,
  subdir: string
): Promise<{ url: string; sha256: string; fileName: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}_${safeName}`;
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, buffer);
  return {
    url: `/uploads/${subdir}/${fileName}`,
    sha256,
    fileName: file.name,
  };
}
