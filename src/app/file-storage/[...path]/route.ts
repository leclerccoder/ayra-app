import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { sanitizeTextInput } from "@/lib/inputSecurity";

export const runtime = "nodejs";

function toContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function sanitizePathSegments(segments: string[]) {
  const cleanSegments = segments
    .map((segment) =>
      sanitizeTextInput(segment, {
        trim: true,
        allowNewlines: false,
        normalizeUnicode: false,
        maxLength: 255,
      })
    )
    .filter(Boolean);

  if (cleanSegments.length !== segments.length) {
    return null;
  }

  for (const segment of cleanSegments) {
    if (
      segment === "." ||
      segment === ".." ||
      segment.includes("/") ||
      segment.includes("\\") ||
      segment.includes("\0")
    ) {
      return null;
    }
  }

  return cleanSegments;
}

export async function GET(
  _: Request,
  context: { params: Promise<{ path?: string[] }> }
) {
  const resolvedParams = await context.params;
  const segments = resolvedParams.path ?? [];
  if (segments.length === 0) {
    return NextResponse.json({ error: "File path is required." }, { status: 400 });
  }

  const safeSegments = sanitizePathSegments(segments);
  if (!safeSegments) {
    return NextResponse.json({ error: "Invalid file path." }, { status: 400 });
  }

  const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
  const absolutePath = path.resolve(uploadsRoot, ...safeSegments);
  const safePrefix = `${uploadsRoot}${path.sep}`;

  if (absolutePath !== uploadsRoot && !absolutePath.startsWith(safePrefix)) {
    return NextResponse.json({ error: "Unsafe file path." }, { status: 400 });
  }

  try {
    const [buffer, stat] = await Promise.all([fs.readFile(absolutePath), fs.stat(absolutePath)]);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": toContentType(absolutePath),
        "Content-Length": String(stat.size),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
}
