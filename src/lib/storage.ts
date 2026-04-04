import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a file to Supabase Storage.
 * @param bucket  Storage bucket name (must exist in Supabase dashboard)
 * @param path    Path within the bucket, e.g. "documents/uuid-filename.pdf"
 * @param file    The File object from an <input type="file"> element
 * @returns       The public URL of the uploaded file
 */
export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage.
 * @param bucket  Storage bucket name
 * @param path    Path within the bucket
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

/**
 * Format a file size in bytes into a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Generate a unique storage path for a file upload.
 * Uses crypto.randomUUID for uniqueness and preserves the file extension.
 */
export function buildStoragePath(prefix: string, file: File): string {
  const ext = file.name.split(".").pop() ?? "bin";
  return `${prefix}/${crypto.randomUUID()}.${ext}`;
}
