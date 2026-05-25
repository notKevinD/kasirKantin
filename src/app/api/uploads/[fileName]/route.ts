import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ fileName: string }> },
) {
  const { fileName } = await context.params;
  const safeFileName = path.basename(fileName);
  const extension = path.extname(safeFileName).toLowerCase();
  const contentType = contentTypes[extension];

  if (!contentType) {
    return NextResponse.json({ message: "Format file tidak valid." }, { status: 400 });
  }

  try {
    const filePath = path.join(process.cwd(), "public", "uploads", safeFileName);
    const file = await readFile(filePath);

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ message: "File tidak ditemukan." }, { status: 404 });
  }
}
