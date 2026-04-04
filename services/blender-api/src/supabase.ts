import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.warn("[supabase] SUPABASE_URL or SUPABASE_SERVICE_KEY is not set — DB updates disabled.");
}

export const supabase = createClient(url ?? "", key ?? "");

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export async function setJobStatus(
  jobId: string,
  status: JobStatus,
  extra: Record<string, unknown> = {}
): Promise<void> {
  if (!url || !key) return;
  const { error } = await supabase
    .from("blender_jobs")
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq("id", jobId);
  if (error) console.error(`[supabase] Failed to update job ${jobId}:`, error.message);
}
