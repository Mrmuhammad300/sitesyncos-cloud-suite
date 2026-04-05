import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/useAppStore";

/**
 * Subscribes to Supabase Realtime on all key tables and keeps the React Query
 * cache up to date without triggering a full refetch on every event.
 *
 * Strategy:
 *  - INSERT: prepend new record to the cached list (no network round-trip)
 *  - UPDATE: replace matching record in the cached list in-place
 *  - DELETE: invalidate (list length changed, pagination may shift)
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
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, (p) => {
        applyUpdate(qc, ["projects"], p);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rfis" }, (p) => {
        applyUpdate(qc, ["rfis"], p);
        if (p.eventType === "INSERT") incrementUnread();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "submittals" }, (p) => {
        applyUpdate(qc, ["submittals"], p);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "change_orders" }, (p) => {
        applyUpdate(qc, ["change_orders"], p);
        if (p.eventType === "INSERT") incrementUnread();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_reports" }, (p) => {
        applyUpdate(qc, ["daily_reports"], p);
      })

      // ── Ops module ────────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "work_orders" }, (p) => {
        applyUpdate(qc, ["work_orders"], p);
        if (p.eventType === "INSERT") incrementUnread();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "draw_requests" }, (p) => {
        applyUpdate(qc, ["draw_requests"], p);
        if (p.eventType === "INSERT") incrementUnread();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "budgets" }, (p) => {
        applyUpdate(qc, ["budgets"], p);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, (p) => {
        applyUpdate(qc, ["documents"], p);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tenants" }, (p) => {
        applyUpdate(qc, ["tenants"], p);
      })

      // ── Vault module ──────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "properties" }, (p) => {
        applyUpdate(qc, ["properties"], p);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lenders" }, (p) => {
        applyUpdate(qc, ["lenders"], p);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "compliance_items" }, (p) => {
        applyUpdate(qc, ["compliance_items"], p);
      })

      // ── Treasury module ───────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "treasury_transactions" }, (p) => {
        applyUpdate(qc, ["treasury_transactions"], p);
      })

      // ── Spatial module ────────────────────────────────────────────────────
      .on("postgres_changes", { event: "*", schema: "public", table: "blender_jobs" }, (p) => {
        applyUpdate(qc, ["blender_jobs"], p);
        // Also update the single-job query used by useBlenderJobStatus
        if (p.eventType === "UPDATE" && p.new.id) {
          qc.setQueryData(["blender_job", p.new.id], p.new);
        } else {
          qc.invalidateQueries({ queryKey: ["blender_job"] });
        }
      })

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, incrementUnread]);
}

// ─── Helper ───────────────────────────────────────────────────────────────────

type WithId = { id: string };
type Payload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

/**
 * Apply a realtime change to a React Query list cache in-place.
 * Only falls back to invalidation on DELETE (list size changes).
 */
function applyUpdate(qc: QueryClient, queryKey: readonly unknown[], payload: Payload) {
  switch (payload.eventType) {
    case "INSERT": {
      const record = payload.new as WithId;
      // Prepend to every cached variation of this key (handles project-scoped lists too)
      qc.setQueriesData<WithId[]>({ queryKey }, (old) => {
        if (!Array.isArray(old)) return old;
        // Avoid duplicates if an optimistic insert already added it
        if (old.some((r) => r.id === record.id)) return old;
        return [record, ...old];
      });
      break;
    }
    case "UPDATE": {
      const record = payload.new as WithId;
      qc.setQueriesData<WithId[]>({ queryKey }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((r) => (r.id === record.id ? { ...r, ...record } : r));
      });
      break;
    }
    case "DELETE": {
      // Invalidate — row is gone, list length and pagination changed
      qc.invalidateQueries({ queryKey });
      break;
    }
  }
}
