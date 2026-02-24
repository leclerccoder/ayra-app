import fs from "node:fs/promises";
import path from "node:path";
import { sanitizeTextInput } from "@/lib/inputSecurity";

function toUploadsStorageSubpath(fileUrl: string) {
  const sanitized = sanitizeTextInput(fileUrl, {
    trim: true,
    allowNewlines: false,
    normalizeUnicode: false,
    maxLength: 2048,
  });
  if (!sanitized) {
    return null;
  }

  const normalized = sanitized.replace(/\\/g, "/");
  const marker = "/uploads/";
  const markerIndex = normalized.toLowerCase().indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const rawCandidate = normalized
    .slice(markerIndex)
    .split("?")[0]
    .split("#")[0];

  if (
    !rawCandidate.startsWith(marker) ||
    rawCandidate.includes("\0") ||
    rawCandidate.includes("..")
  ) {
    return null;
  }

  return rawCandidate.slice(marker.length);
}

export function resolveStoredUploadsFilePath(fileUrl: string) {
  const subpath = toUploadsStorageSubpath(fileUrl);
  if (!subpath) {
    return null;
  }

  const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
  const absolutePath = path.resolve(uploadsRoot, subpath);
  const safePrefix = `${uploadsRoot}${path.sep}`;

  if (absolutePath !== uploadsRoot && !absolutePath.startsWith(safePrefix)) {
    return null;
  }

  return absolutePath;
}

export async function isStoredUploadsFileAvailable(fileUrl: string) {
  const absolutePath = resolveStoredUploadsFilePath(fileUrl);
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
