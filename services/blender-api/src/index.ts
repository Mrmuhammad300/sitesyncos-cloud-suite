import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { router } from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = parseInt(process.env.PORT ?? "3999", 10);

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer — attach file upload to /api/blender/process only
const upload = multer({
  dest: path.join(__dirname, "..", "uploads"),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});
app.post("/api/blender/process", upload.single("file"));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/", router);

// ─── 404 fallback ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🔧 SiteSyncOS Blender API`);
  console.log(`   Listening  : http://localhost:${PORT}`);
  console.log(`   Blender MCP: ${process.env.BLENDER_HOST ?? "127.0.0.1"}:${process.env.BLENDER_PORT ?? "9876"}`);
  console.log(`   Supabase   : ${process.env.SUPABASE_URL ? "✓" : "✗ SUPABASE_URL missing"}`);
  console.log(`   Service Key: ${process.env.SUPABASE_SERVICE_KEY ? "✓" : "✗ SUPABASE_SERVICE_KEY missing"}\n`);
});
