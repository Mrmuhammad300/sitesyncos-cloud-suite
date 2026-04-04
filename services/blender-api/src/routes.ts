import { Router, Request, Response } from "express";
import { supabase, setJobStatus } from "./supabase.js";
import { sendToBlender, buildBlenderCode } from "./blender.js";
import fs from "fs";

export const router = Router();

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
    const { job_id, job_type, prompt } = req.body as {
      job_id: string;
      job_type: string;
      prompt?: string;
    };

    // Multer puts the file at req.file when middleware is applied in index.ts
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!job_id) {
      res.status(400).json({ error: "job_id is required" });
      return;
    }

    // Respond immediately — processing happens async
    res.json({ ok: true, job_id });

    await setJobStatus(job_id, "processing");

    try {
      const code = buildBlenderCode(job_type, prompt, file?.path);
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
  const { data, error } = await supabase
    .from("blender_jobs")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error) {
    res.status(404).json({ error: error.message });
    return;
  }
  res.json(data);
});
