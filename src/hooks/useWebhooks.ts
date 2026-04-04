import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Webhook = Tables<"webhooks">;

// Known event types for webhook subscriptions
export const WEBHOOK_EVENTS = [
  "rfi.created",
  "rfi.updated",
  "rfi.closed",
  "change_order.created",
  "change_order.approved",
  "change_order.rejected",
  "draw_request.created",
  "draw_request.approved",
  "draw_request.rejected",
  "daily_report.created",
  "work_order.created",
  "work_order.completed",
  "project.created",
  "project.status_changed",
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useWebhooks() {
  return useQuery({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useWebhookDeliveries(webhookId: string | null) {
  return useQuery({
    queryKey: ["webhook_deliveries", webhookId],
    queryFn: async () => {
      if (!webhookId) return [];
      const { data, error } = await supabase
        .from("webhook_deliveries" as never)
        .select("*")
        .eq("webhook_id", webhookId)
        .order("delivered_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Array<{
        id: string;
        webhook_id: string;
        event_type: string;
        payload: Record<string, unknown>;
        response_status: number | null;
        response_body: string | null;
        attempt: number;
        delivered_at: string;
      }>;
    },
    enabled: !!webhookId,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TablesInsert<"webhooks">) => {
      const { data, error } = await supabase
        .from("webhooks")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"webhooks"> & { id: string }) => {
      const { data, error } = await supabase
        .from("webhooks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("webhooks")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success(vars.is_active ? "Webhook enabled" : "Webhook disabled");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
