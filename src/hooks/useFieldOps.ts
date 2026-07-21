import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

// ---------- Contractors ----------

export function useContractors() {
  return useQuery({
    queryKey: ["contractors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contractors").select("*").order("company_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: TablesInsert<"contractors">) => {
      const { data, error } = await supabase.from("contractors").insert(c).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contractors"] }); toast.success("Contractor added"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"contractors"> & { id: string }) => {
      const { data, error } = await supabase.from("contractors").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contractors"] }); toast.success("Contractor updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contractors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contractors"] }); toast.success("Contractor removed"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- Work order checklist items ----------

export function useChecklistItems(workOrderId: string | null | undefined) {
  return useQuery({
    queryKey: ["work_order_checklist_items", workOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_order_checklist_items")
        .select("*")
        .eq("work_order_id", workOrderId as string)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!workOrderId,
  });
}

// Lightweight count map for progress badges in list views, without a query per row.
export function useChecklistProgress(workOrderIds: string[]) {
  return useQuery({
    queryKey: ["work_order_checklist_items", "progress", workOrderIds],
    queryFn: async () => {
      if (workOrderIds.length === 0) return {} as Record<string, { total: number; done: number }>;
      const { data, error } = await supabase
        .from("work_order_checklist_items")
        .select("work_order_id, is_complete")
        .in("work_order_id", workOrderIds);
      if (error) throw error;
      const progress: Record<string, { total: number; done: number }> = {};
      for (const row of data) {
        const p = (progress[row.work_order_id] ??= { total: 0, done: 0 });
        p.total += 1;
        if (row.is_complete) p.done += 1;
      }
      return progress;
    },
    enabled: workOrderIds.length > 0,
  });
}

export function useAddChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: TablesInsert<"work_order_checklist_items">) => {
      const { data, error } = await supabase.from("work_order_checklist_items").insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["work_order_checklist_items"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useToggleChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_complete, completed_by }: { id: string; is_complete: boolean; completed_by?: string | null }) => {
      const { data, error } = await supabase
        .from("work_order_checklist_items")
        .update({
          is_complete,
          completed_at: is_complete ? new Date().toISOString() : null,
          completed_by: is_complete ? (completed_by ?? null) : null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_order_checklist_items"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_order_checklist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_order_checklist_items"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------- PM <-> field messaging (per work order, realtime) ----------

export function useWorkOrderMessages(workOrderId: string | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["work_order_messages", workOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_order_messages")
        .select("*")
        .eq("work_order_id", workOrderId as string)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!workOrderId,
  });

  useEffect(() => {
    if (!workOrderId) return;
    const channel = supabase
      .channel(`wo-messages-${workOrderId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "work_order_messages", filter: `work_order_id=eq.${workOrderId}` },
        () => { qc.invalidateQueries({ queryKey: ["work_order_messages", workOrderId] }); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workOrderId, qc]);

  return query;
}

export function useSendWorkOrderMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (msg: TablesInsert<"work_order_messages">) => {
      const { data, error } = await supabase.from("work_order_messages").insert(msg).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["work_order_messages", data.work_order_id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}
