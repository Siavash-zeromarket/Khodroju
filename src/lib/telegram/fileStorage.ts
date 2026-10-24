// lib/telegram/fileStorage.ts
//
// Persistent backend storage for bot files (Supabase Storage bucket `bot_files`).
// Storage paths are derived from the file's DB `id` + extension, so arbitrary
// original filenames (Persian, spaces, slashes) never touch the path — the real
// filename is only used for download naming (Content-Disposition / multipart).
//
// Self-contained on purpose: it owns a lazy service-role client and talks to
// Telegram directly, so telegram.ts can import it without a circular import.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_FILES_BUCKET = "bot_files";

// Lazy-initialized Supabase client (avoids build-time errors)
let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

// Minimal shape needed to locate a stored copy (structurally compatible with FileItem)
export interface StorableFile {
  id: string;
  filename: string;
  telegram_file_id?: string | null;
}

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  zip: "application/zip",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function extensionOf(filename: string): string {
  return filename.match(/\.([A-Za-z0-9]{1,8})$/)?.[1].toLowerCase() ?? "";
}

export function contentTypeFor(filename: string): string {
  return MIME_TYPES[extensionOf(filename)] || "application/octet-stream";
}

export function storagePathFor(file: StorableFile): string {
  const ext = extensionOf(file.filename);
  return `${file.id}/${file.id}${ext ? `.${ext}` : ""}`;
}

// RFC 5987 Content-Disposition so downloads keep the original filename.
// The plain `filename` fallback is ASCII-folded — HTTP header values cannot
// carry raw non-Latin1 characters (Persian filenames).
export function contentDisposition(filename: string): string {
  const ascii = filename
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

let bucketReady = false;
async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  const { error } = await getSupabase().storage.createBucket(BOT_FILES_BUCKET, {
    public: false,
  });
  if (!error || /already exist/i.test(error.message)) {
    bucketReady = true;
    return;
  }
  // Don't cache the failure — retry on the next call
  console.error("ensureBucket failed:", error.message);
}

// Pull raw bytes from Telegram's file server. Server-side only — the bot token
// stays in this fetch, it is never exposed in a URL we send to users.
export async function fetchTelegramFileBytes(
  fileId: string,
): Promise<ArrayBuffer | null> {
  if (!BOT_TOKEN) return null;
  try {
    const infoRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`,
    );
    const info = await infoRes.json();
    if (!info.ok || !info.result?.file_path) {
      console.error("getFile failed:", info.description);
      return null;
    }
    const fileRes = await fetch(
      `https://api.telegram.org/file/bot${BOT_TOKEN}/${info.result.file_path}`,
    );
    if (!fileRes.ok) {
      console.error("Telegram file download failed:", fileRes.status);
      return null;
    }
    return await fileRes.arrayBuffer();
  } catch (error) {
    console.error("fetchTelegramFileBytes error:", error);
    return null;
  }
}

async function storedObjectExists(path: string): Promise<boolean> {
  const slash = path.indexOf("/");
  const folder = path.slice(0, slash);
  const name = path.slice(slash + 1);
  const { data, error } = await getSupabase().storage.from(BOT_FILES_BUCKET).list(folder);
  if (error) return false;
  return !!data?.some((entry) => entry.name === name);
}

/**
 * Return the storage path for a file, pulling the bytes over from Telegram on
 * first request (lazy migration for legacy rows that only have telegram_file_id).
 * Returns null when no stored copy could be obtained.
 */
export async function ensureStoredFile(file: StorableFile): Promise<string | null> {
  try {
    const path = storagePathFor(file);
    await ensureBucket();
    if (await storedObjectExists(path)) return path;
    if (!file.telegram_file_id) return null;

    const bytes = await fetchTelegramFileBytes(file.telegram_file_id);
    if (!bytes) return null;

    const { error } = await getSupabase()
      .storage.from(BOT_FILES_BUCKET)
      .upload(path, bytes, {
        contentType: contentTypeFor(file.filename),
        upsert: true,
        cacheControl: "2592000",
      });
    if (error) {
      console.error("ensureStoredFile upload failed:", error.message);
      return null;
    }
    return path;
  } catch (error) {
    console.error("ensureStoredFile error:", error);
    return null;
  }
}

/** Short-lived signed URL that downloads as the original filename. */
export async function createFileDownloadUrl(
  path: string,
  filename: string,
): Promise<string | null> {
  try {
    const { data, error } = await getSupabase()
      .storage.from(BOT_FILES_BUCKET)
      .createSignedUrl(path, 3600, { download: filename });
    if (error) {
      console.error("createFileDownloadUrl error:", error.message);
      return null;
    }
    return data.signedUrl;
  } catch (error) {
    console.error("createFileDownloadUrl error:", error);
    return null;
  }
}

export async function downloadStoredFile(path: string): Promise<Blob | null> {
  try {
    const { data, error } = await getSupabase()
      .storage.from(BOT_FILES_BUCKET)
      .download(path);
    if (error) {
      console.error("downloadStoredFile error:", error.message);
      return null;
    }
    return data;
  } catch (error) {
    console.error("downloadStoredFile error:", error);
    return null;
  }
}

/** Best-effort removal of one file's stored copy (called on deletes). */
export async function removeStoredFile(file: StorableFile): Promise<void> {
  try {
    const { error } = await getSupabase()
      .storage.from(BOT_FILES_BUCKET)
      .remove([storagePathFor(file)]);
    if (error) console.error("removeStoredFile error:", error.message);
  } catch (error) {
    console.error("removeStoredFile error:", error);
  }
}

/** Best-effort wipe of every object in the bucket (used by purge-all). */
export async function removeAllStoredFiles(): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: folders, error } = await supabase.storage.from(BOT_FILES_BUCKET).list();
    if (error) {
      console.error("removeAllStoredFiles list error:", error.message);
      return;
    }
    for (const entry of folders ?? []) {
      if (entry.id !== null) continue; // root-level object, not a folder
      const { data: children } = await supabase.storage
        .from(BOT_FILES_BUCKET)
        .list(entry.name);
      const paths = (children ?? [])
        .filter((child) => child.id !== null)
        .map((child) => `${entry.name}/${child.name}`);
      if (paths.length > 0) {
        const { error: removeError } = await supabase.storage
          .from(BOT_FILES_BUCKET)
          .remove(paths);
        if (removeError) {
          console.error("removeAllStoredFiles remove error:", removeError.message);
        }
      }
    }
  } catch (error) {
    console.error("removeAllStoredFiles error:", error);
  }
}
