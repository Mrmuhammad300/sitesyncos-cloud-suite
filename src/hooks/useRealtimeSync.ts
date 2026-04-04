import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/useAppStore";

/**
 * Subscribes to Supabase Realtime on all key tables and invalidates the
 * corresponding React Query cache keys so the UI refreshes automatically.
 *
 * Mount once at the app root (AppLayout) — do NOT mount per-page.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  const incrementUnread = useAppStore((s) => s.incrementUnread);

  useEffect(() => {
    const channel = supabase
      .channel("global-realtime-sync")

      // ── Build module ──────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        qc.invalidateQueries({ queryKey: ["projects"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rfis" }, (payload) => {
        qc.invalidateQueries({ queryKey: ["rfis"] });
        if (payload.eventType === "INSERT") incrementUnread();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "submittals" }, () => {
        qc.invalidateQueries({ queryKey: ["submittals"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "change_orders" }, (payload) => {
        qc.invalidateQueries({ queryKey: ["change_orders"] });
        if (payload.eventType === "INSERT") incrementUnread();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_reports" }, () => {
        qc.invalidateQueries({ queryKey: ["daily_reports"] });
      })

      // ── Ops module ────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, (payload) => {
        qc.invalidateQueries({ queryKey: ["work_orders"] });
        if (payload.eventType === "INSERT") incrementUnread();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "draw_requests" }, (payload) => {
        qc.invalidateQueries({ queryKey: ["draw_requests"] });
        if (payload.eventType === "INSERT") incrementUnread();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "budgets" }, () => {
        qc.invalidateQueries({ queryKey: ["budgets"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => {
        qc.invalidateQueries({ queryKey: ["documents"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tenants" }, () => {
        qc.invalidateQueries({ queryKey: ["tenants"] });
      })

      // ── Vault module ──────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, () => {
        qc.invalidateQueries({ queryKey: ["properties"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lenders" }, () => {
        qc.invalidateQueries({ queryKey: ["lenders"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "compliance_items" }, () => {
        qc.invalidateQueries({ queryKey: ["compliance_items"] });
      })

      // ── Treasury module ───────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "treasury_transactions" }, () => {
        qc.invalidateQueries({ queryKey: ["treasury_transactions"] });
      })

      // ── Spatial module ────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "blender_jobs" }, () => {
        qc.invalidateQueries({ queryKey: ["blender_jobs"] });
        qc.invalidateQueries({ queryKey: ["blender_job"] });
      })

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, incrementUnread]);
}
