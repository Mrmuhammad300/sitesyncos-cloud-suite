import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  esbuild: {
    // Remove debugger statements; mark console.log as pure (tree-shaken) in production
    drop: mode === "production" ? (["debugger"] as const) : [],
    pure: mode === "production" ? ["console.log"] : [],
  },
  build: {
    target: "es2020",
    sourcemap: mode !== "production",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Only split long-lived framework code. Heavy libraries (three, recharts)
        // stay in the lazy route chunks that actually use them.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[/\\]node_modules[/\\](react|react-dom|react-router|react-router-dom|scheduler)[/\\]/.test(id)) return "vendor-react";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@tanstack")) return "vendor-query";
          return undefined;
        },
      },
    },
  },
}));
