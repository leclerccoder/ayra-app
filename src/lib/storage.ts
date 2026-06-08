import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";

export async function saveUploadedFile(
  file: File,
  subdir: string
): Promise<{ url: string; sha256: string; fileName: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}_${safeName}`;
  const storagePath = `${sanitizeStorageSegment(subdir)}/${fileName}`;

  if (getFileStorageDriver() === "database") {
    await prisma.storedFile.create({
      data: {
        path: storagePath,
        fileName: file.name,
        contentType: file.type || null,
        size: buffer.length,
        sha256,
        data: buffer,
      },
    });
    return {
      url: `/uploads/${storagePath}`,
      sha256,
      fileName: file.name,
    };
  }

  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, buffer);
  return {
    url: `/uploads/${storagePath}`,
    sha256,
    fileName: file.name,
  };
}

export function getFileStorageDriver() {
  return process.env.FILE_STORAGE_DRIVER?.toLowerCase() === "database"
    ? "database"
    : "filesystem";
}

function sanitizeStorageSegment(value: string) {
  const segment = value.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!segment || segment === "." || segment === "..") {
    throw new Error("Invalid storage folder.");
  }
  return segment;
}

export function toUploadsStorageSubpath(fileUrl: string) {
  const normalized = fileUrl.trim().replace(/\\/g, "/");
  const marker = "/uploads/";
  const markerIndex = normalized.toLowerCase().indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const rawCandidate = normalized
    .slice(markerIndex + marker.length)
    .split("?")[0]
    .split("#")[0];

  if (
    !rawCandidate ||
    rawCandidate.includes("\0") ||
    rawCandidate.includes("..") ||
    rawCandidate.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return null;
  }

  return rawCandidate;
}

export function resolveFilesystemUploadPathFromSubpath(subpath: string) {
  const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
  const absolutePath = path.resolve(uploadsRoot, subpath);
  const safePrefix = `${uploadsRoot}${path.sep}`;

  if (absolutePath !== uploadsRoot && !absolutePath.startsWith(safePrefix)) {
    return null;
  }

  return absolutePath;
}

export function resolveFilesystemUploadPath(fileUrl: string) {
  const subpath = toUploadsStorageSubpath(fileUrl);
  if (!subpath) {
    return null;
  }
  return resolveFilesystemUploadPathFromSubpath(subpath);
}

export async function readStoredUploadBySubpath(subpath: string) {
  if (getFileStorageDriver() === "database") {
    const file = await prisma.storedFile.findUnique({
      where: { path: subpath },
    });
    if (!file) {
      return null;
    }
    return {
      buffer: Buffer.from(file.data),
      contentType: file.contentType,
      size: file.size,
      fileName: file.fileName,
      sha256: file.sha256,
      path: file.path,
    };
  }

  const absolutePath = resolveFilesystemUploadPathFromSubpath(subpath);
  if (!absolutePath) {
    return null;
  }

  try {
    const [buffer, stat] = await Promise.all([
      fs.readFile(absolutePath),
      fs.stat(absolutePath),
    ]);
    return {
      buffer,
      contentType: null,
      size: stat.size,
      fileName: path.basename(absolutePath),
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
      path: subpath,
    };
  } catch {
    return null;
  }
}

export async function readStoredUploadByUrl(fileUrl: string) {
  const subpath = toUploadsStorageSubpath(fileUrl);
  if (!subpath) {
    return null;
  }
  return readStoredUploadBySubpath(subpath);
}

export async function deleteStoredUploadByUrl(fileUrl: string) {
  const subpath = toUploadsStorageSubpath(fileUrl);
  if (!subpath) {
    return;
  }

  if (getFileStorageDriver() === "database") {
    await prisma.storedFile.deleteMany({ where: { path: subpath } });
    return;
  }

  const absolutePath = resolveFilesystemUploadPathFromSubpath(subpath);
  if (!absolutePath) {
    return;
  }
  await fs.unlink(absolutePath).catch(() => {});
}

export async function isStoredUploadAvailable(fileUrl: string) {
  const subpath = toUploadsStorageSubpath(fileUrl);
  if (!subpath) {
    return true;
  }

  if (getFileStorageDriver() === "database") {
    const count = await prisma.storedFile.count({ where: { path: subpath } });
    return count > 0;
  }

  const absolutePath = resolveFilesystemUploadPathFromSubpath(subpath);
  if (!absolutePath) {
    return true;
  }

  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}
