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

export function toStoredFileHref(fileUrl: string, fallback = "#") {
  const subpath = toUploadsStorageSubpath(fileUrl);
  if (!subpath) {
    return fallback;
  }

  const encodedPath = subpath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/file-storage/${encodedPath}`;
}
