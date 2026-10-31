import { createRoot } from "react-dom/client";
import "./index.css";

const root = createRoot(document.getElementById("root")!);

const REQUIRED = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;
const missing = REQUIRED.filter((k) => !import.meta.env[k]);

if (missing.length) {
  // Render a helpful setup screen instead of crashing on a misconfigured deploy.
  import("./components/os/SetupScreen").then(({ SetupScreen }) => root.render(<SetupScreen missing={[...missing]} />));
} else {
  import("./App.tsx").then(({ default: App }) => root.render(<App />));
}
