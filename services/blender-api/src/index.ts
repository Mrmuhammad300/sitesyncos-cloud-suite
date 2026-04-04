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

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Restrict to known origins in production; allow all in development.

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:8080", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., server-to-server, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: Origin '${origin}' not allowed`));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─── File upload ──────────────────────────────────────────────────────────────
// Multer — attach only to /api/blender/process; restrict MIME types.

const ALLOWED_MIME_TYPES = new Set([
  "model/gltf-binary",
  "model/gltf+json",
  "application/octet-stream",
  "image/png",
  "image/jpeg",
  "application/x-ifc",
]);

const upload = multer({
  dest: path.join(__dirname, "..", "uploads"),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype) || file.mimetype.startsWith("model/")) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not permitted`));
    }
  },
});

app.post("/api/blender/process", upload.single("file"));

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/", router);

// ─── 404 fallback ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err.message);
  if (err.message.startsWith("CORS:")) {
    res.status(403).json({ error: err.message });
    return;
  }
  if (err.message.includes("File type")) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🔧 SiteSyncOS Blender API`);
  console.log(`   Listening  : http://localhost:${PORT}`);
  console.log(`   Blender MCP: ${process.env.BLENDER_HOST ?? "127.0.0.1"}:${process.env.BLENDER_PORT ?? "9876"}`);
  console.log(`   Supabase   : ${process.env.SUPABASE_URL ? "✓" : "✗ SUPABASE_URL missing"}`);
  console.log(`   Service Key: ${process.env.SUPABASE_SERVICE_KEY ? "✓" : "✗ SUPABASE_SERVICE_KEY missing"}`);
  console.log(`   CORS Origins: ${allowedOrigins.join(", ")}\n`);
});
