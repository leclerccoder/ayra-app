type SanitizeStringOptions = {
  trim?: boolean;
  allowNewlines?: boolean;
  normalizeUnicode?: boolean;
  maxLength?: number;
};

const DEFAULT_MAX_LENGTH = 4096;
const SAFE_HOST_PATTERN =
  /^(?:localhost|127\.0\.0\.1|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})(?::\d{1,5})?$/i;

function removeDisallowedChars(value: string, allowNewlines: boolean) {
  const pattern = allowNewlines
    ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g
    : /[\u0000-\u001F\u007F]/g;
  return value.replace(pattern, "");
}

export function sanitizeTextInput(
  value: unknown,
  options: SanitizeStringOptions = {}
): string {
  if (typeof value !== "string") {
    return "";
  }

  const {
    trim = true,
    allowNewlines = true,
    normalizeUnicode = true,
    maxLength = DEFAULT_MAX_LENGTH,
  } = options;

  let next = normalizeUnicode ? value.normalize("NFKC") : value;
  next = removeDisallowedChars(next, allowNewlines);

  if (!allowNewlines) {
    next = next.replace(/[\r\n\t]+/g, " ");
  } else {
    next = next.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  if (trim) {
    next = next.trim();
  }

  if (maxLength > 0 && next.length > maxLength) {
    return next.slice(0, maxLength);
  }

  return next;
}

export function getSanitizedFormText(
  formData: FormData,
  key: string,
  options: SanitizeStringOptions = {}
) {
  return sanitizeTextInput(formData.get(key), options);
}

export function getSanitizedOptionalFormText(
  formData: FormData,
  key: string,
  options: SanitizeStringOptions = {}
) {
  const value = sanitizeTextInput(formData.get(key), options);
  return value ? value : undefined;
}

export function sanitizeStringArray(
  values: unknown[],
  options: SanitizeStringOptions = {}
) {
  return values
    .map((value) => sanitizeTextInput(value, options))
    .filter((value) => value.length > 0);
}

export function sanitizeHostHeader(value: string | null | undefined) {
  const host = sanitizeTextInput(value ?? "", {
    trim: true,
    allowNewlines: false,
    normalizeUnicode: false,
    maxLength: 255,
  }).toLowerCase();

  if (!host || host.includes("/") || host.includes("@") || host.includes("..")) {
    return null;
  }

  return SAFE_HOST_PATTERN.test(host) ? host : null;
}

export function sanitizeForwardedProtocol(value: string | null | undefined) {
  const protocol = sanitizeTextInput(value ?? "", {
    trim: true,
    allowNewlines: false,
    normalizeUnicode: false,
    maxLength: 32,
  })
    .split(",")[0]
    ?.trim()
    .toLowerCase();

  if (protocol === "http" || protocol === "https") {
    return protocol;
  }

  return null;
}

export function toSafeInternalPath(value: string | null | undefined, fallback: string) {
  const path = sanitizeTextInput(value ?? "", {
    trim: true,
    allowNewlines: false,
    normalizeUnicode: false,
    maxLength: 1024,
  });

  if (!path.startsWith("/") || path.startsWith("//")) {
    return fallback;
  }

  if (path.includes("\\") || path.includes("\0")) {
    return fallback;
  }

  return path;
}

function toRelativeUploadsPath(value: string) {
  const normalized = value.replace(/\\/g, "/");
  const marker = "/uploads/";
  const markerIndex = normalized.toLowerCase().indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const candidate = normalized.slice(markerIndex);
  if (candidate.startsWith("//") || candidate.includes("\0")) {
    return null;
  }

  if (!candidate.toLowerCase().startsWith(marker)) {
    return null;
  }

  return `/uploads/${candidate.slice(marker.length)}`;
}

export function toSafeHref(value: string | null | undefined, fallback = "#") {
  const href = sanitizeTextInput(value ?? "", {
    trim: true,
    allowNewlines: false,
    normalizeUnicode: false,
    maxLength: 2048,
  });

  if (!href) {
    return fallback;
  }

  if (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\") && !href.includes("\0")) {
    return href;
  }

  const relativeUploadsPath = toRelativeUploadsPath(href);
  if (relativeUploadsPath) {
    return relativeUploadsPath;
  }

  try {
    const parsed = new URL(href);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      const uploadsPath = toRelativeUploadsPath(parsed.pathname);
      if (uploadsPath) {
        return `${uploadsPath}${parsed.search}${parsed.hash}`;
      }

      return parsed.toString();
    }
  } catch {
    return fallback;
  }

  return fallback;
}
