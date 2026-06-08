import { sanitizeTextInput } from "@/lib/inputSecurity";
import {
  isStoredUploadAvailable,
  resolveFilesystemUploadPath,
  toUploadsStorageSubpath,
} from "@/lib/storage";

function toSanitizedUploadsSubpath(fileUrl: string) {
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

  return toUploadsStorageSubpath(rawCandidate);
}

export function resolveStoredUploadsFilePath(fileUrl: string) {
  const subpath = toSanitizedUploadsSubpath(fileUrl);
  if (!subpath) {
    return null;
  }

  return resolveFilesystemUploadPath(`/uploads/${subpath}`);
}

export async function isStoredUploadsFileAvailable(fileUrl: string) {
  return isStoredUploadAvailable(fileUrl);
}
