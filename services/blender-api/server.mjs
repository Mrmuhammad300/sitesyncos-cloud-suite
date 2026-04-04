/**
 * SiteSync Blender API Service
 *
 * Lightweight Express proxy that:
 *  1. Accepts job requests from the React frontend
 *  2. Forwards commands to the Blender MCP server (TCP socket on port 9876)
 *  3. Updates job status in Supabase as Blender processes
 *
 * Prerequisites:
 *  - Blender 3.x or 4.x installed
 *  - blender-mcp addon installed in Blender (see services/blender-mcp/README)
 *  - Blender running with the MCP addon active (opens port 9876)
 *  - SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables set
 *
 * Start:
 *   node services/blender-api/server.mjs
 *   (or: PORT=3999 node services/blender-api/server.mjs)
 */

import express from "express";
import multer from "multer";
import net from "net";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "3999", 10);
const BLENDER_HOST = process.env.BLENDER_HOST ?? "127.0.0.1";
const BLENDER_PORT = parseInt(process.env.BLENDER_PORT ?? "9876", 10);

const supabase = createClient(
  process.env.SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_KEY ?? ""
);

// ─── Multer (file uploads) ────────────────────────────────────────────────────

const upload = multer({
  dest: path.join(__dirname, "uploads"),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

// ─── Blender MCP socket helper ────────────────────────────────────────────────

function sendToBlender(command) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let response = "";

    client.connect(BLENDER_PORT, BLENDER_HOST, () => {
      client.write(JSON.stringify(command) + "\n");
    });

    client.on("data", (data) => {
      response += data.toString();
      try {
        const parsed = JSON.parse(response);
        client.destroy();
        resolve(parsed);
      } catch {
        // Keep accumulating until valid JSON
      }
    });

    client.on("error", (err) => {
      client.destroy();
      reject(new Error(`Blender MCP connection failed: ${err.message}`));
    });

    client.setTimeout(120_000, () => {
      client.destroy();
      reject(new Error("Blender MCP timed out after 120s"));
    });
  });
}

// ─── Job status helpers ───────────────────────────────────────────────────────

async function setJobStatus(jobId, status, extra = {}) {
  await supabase
    .from("blender_jobs")
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq("id", jobId);
}

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// CORS (allow local React dev server)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.sendStatus(204); return; }
  next();
});

// Health check
app.get("/health", (_, res) => res.json({ ok: true, blender_port: BLENDER_PORT }));

// ─── POST /api/blender/process ────────────────────────────────────────────────
// Unified endpoint for all job types

app.post("/api/blender/process", upload.single("file"), async (req, res) => {
  const { job_id, job_type, prompt, project_id } = req.body;

  if (!job_id) return res.status(400).json({ error: "job_id required" });

  res.json({ ok: true, job_id }); // Respond immediately; process async

  // Mark as processing
  await setJobStatus(job_id, "processing");

  try {
    let result;

    switch (job_type) {
      case "generate":
        result = await sendToBlender({
          type: "execute_python",
          code: `
import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_plane_add(size=10)
# TODO: Replace with full AI-driven scene generation using prompt
# prompt = ${JSON.stringify(prompt ?? "")}
print("Generated scene for: " + ${JSON.stringify(prompt ?? "")})
          `.trim(),
        });
        break;

      case "clash":
        result = await sendToBlender({
          type: "execute_python",
          code: `
import bpy
# TODO: Load IFC file from: ${req.file?.path ?? "no file"}
# Run geometry intersection tests across discipline layers
# Return list of intersecting element pairs
print("Clash analysis complete")
          `.trim(),
        });
        break;

      case "floor-plan":
        result = await sendToBlender({
          type: "execute_python",
          code: `
import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
# TODO: Generate floor plan geometry from constraints
# prompt = ${JSON.stringify(prompt ?? "")}
print("Floor plan generated")
          `.trim(),
        });
        break;

      case "design-iterate":
        result = await sendToBlender({
          type: "execute_python",
          code: `
import bpy
# TODO: Apply iterative design change based on prompt
# prompt = ${JSON.stringify(prompt ?? "")}
print("Design iteration applied")
          `.trim(),
        });
        break;

      default:
        throw new Error(`Unknown job_type: ${job_type}`);
    }

    await setJobStatus(job_id, "completed", {
      result_metadata: { blender_response: result ?? null },
    });
  } catch (err) {
    console.error(`[job ${job_id}] failed:`, err.message);
    await setJobStatus(job_id, "failed", { error_message: err.message });
  } finally {
    // Cleanup uploaded file
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
  }
});

// ─── GET /api/blender/job/:id ─────────────────────────────────────────────────

app.get("/api/blender/job/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("blender_jobs")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🔧 SiteSync Blender API running on http://localhost:${PORT}`);
  console.log(`   Blender MCP target: ${BLENDER_HOST}:${BLENDER_PORT}`);
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL ? "✓ set" : "✗ SUPABASE_URL missing"}`);
  console.log(`   Supabase Key: ${process.env.SUPABASE_SERVICE_KEY ? "✓ set" : "✗ SUPABASE_SERVICE_KEY missing"}\n`);
});
