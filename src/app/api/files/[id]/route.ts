// app/api/files/[id]/route.ts
//
// Public download endpoint for bot files. Resolves the file row, ensures it is
// stored in backend storage (lazily migrating legacy Telegram-only rows), then
// redirects to a short-lived signed URL that downloads as the original filename.
// Falls back to streaming bytes fetched from Telegram server-side — the bot
// token is never exposed to the client.

import { NextResponse, type NextRequest } from "next/server";
import { getFile } from "@/lib/telegram/telegram";
import {
  contentDisposition,
  contentTypeFor,
  createFileDownloadUrl,
  ensureStoredFile,
  fetchTelegramFileBytes,
} from "@/lib/telegram/fileStorage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const file = await getFile(id);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Preferred: backend storage → signed URL with the real filename.
    // 302 (not 301) because signed URLs expire.
    const path = await ensureStoredFile(file);
    if (path) {
      const url = await createFileDownloadUrl(path, file.filename);
      if (url) {
        const res = NextResponse.redirect(url, 302);
        res.headers.set("Cache-Control", "no-store");
        return res;
      }
    }

    // Fallback: stream the bytes directly (token stays on the server).
    if (file.telegram_file_id) {
      const bytes = await fetchTelegramFileBytes(file.telegram_file_id);
      if (bytes) {
        return new Response(bytes, {
          headers: {
            "Content-Type": contentTypeFor(file.filename),
            "Content-Disposition": contentDisposition(file.filename),
            "Cache-Control": "private, max-age=3600",
          },
        });
      }
    }

    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  } catch (error) {
    console.error("files/[id] route error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
