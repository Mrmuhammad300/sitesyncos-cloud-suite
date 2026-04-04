import { Router, Request, Response } from "express";
import { supabase, setJobStatus } from "./supabase.js";
import { sendToBlender, buildBlenderCode } from "./blender.js";
import fs from "fs";

export const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_JOB_TYPES = new Set(["generate", "clash", "floor-plan", "design-iterate"]);

function isValidUUID(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function isValidJobType(v: unknown): boolean {
  return typeof v === "string" && VALID_JOB_TYPES.has(v);
}

function sanitizeText(v: unknown, maxLen = 2000): string | undefined {
  if (v === undefined || v === null) return undefined;
  return String(v).slice(0, maxLen);
}

// ─── Health ──────────────────────────────────────────────────────────────────

router.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    blender_host: process.env.BLENDER_HOST ?? "127.0.0.1",
    blender_port: process.env.BLENDER_PORT ?? "9876",
    supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
  });
});

// ─── POST /api/blender/process ────────────────────────────────────────────────

router.post(
  "/api/blender/process",
  async (req: Request, res: Response) => {
    const { job_id, job_type, prompt, project_id } = req.body as {
      job_id: unknown;
      job_type: unknown;
      prompt?: unknown;
      project_id?: unknown;
    };

    // Input validation
    if (!isValidUUID(job_id)) {
      res.status(400).json({ error: "job_id must be a valid UUID" });
      return;
    }

    if (!isValidJobType(job_type)) {
      res.status(400).json({ error: `job_type must be one of: ${[...VALID_JOB_TYPES].join(", ")}` });
      return;
    }

    if (project_id !== undefined && !isValidUUID(project_id)) {
      res.status(400).json({ error: "project_id must be a valid UUID" });
      return;
    }

    const sanitizedPrompt = sanitizeText(prompt);

    // Multer puts the file at req.file when middleware is applied in index.ts
    const file = (req as Request & { file?: Express.Multer.File }).file;

    // Respond immediately — processing happens async
    res.json({ ok: true, job_id });

    await setJobStatus(job_id, "processing");

    try {
      const code = buildBlenderCode(job_type as string, sanitizedPrompt, file?.path);
      const result = await sendToBlender({ type: "execute_python", code });

      await setJobStatus(job_id, "completed", {
        result_metadata: { blender_response: result },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[job ${job_id}] failed:`, message);
      await setJobStatus(job_id, "failed", { error_message: message });
    } finally {
      if (file?.path) fs.unlink(file.path, () => {});
    }
  }
);

// ─── GET /api/blender/job/:id ─────────────────────────────────────────────────

router.get("/api/blender/job/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!isValidUUID(id)) {
    res.status(400).json({ error: "id must be a valid UUID" });
    return;
  }

  const { data, error } = await supabase
    .from("blender_jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    res.status(404).json({ error: error.message });
    return;
  }
  res.json(data);
});
