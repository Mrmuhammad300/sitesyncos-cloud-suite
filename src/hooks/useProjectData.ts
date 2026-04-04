import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

// ─── Projects ────────────────────────────────────────────────────────────────

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (project: TablesInsert<"projects">) => {
      const { data, error } = await supabase.from("projects").insert(project).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Project created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"projects"> & { id: string }) => {
      const { data, error } = await supabase.from("projects").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Project updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Project deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── RFIs ─────────────────────────────────────────────────────────────────────

export function useRFIs() {
  return useQuery({
    queryKey: ["rfis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rfis").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRFI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rfi: TablesInsert<"rfis">) => {
      const { data, error } = await supabase.from("rfis").insert(rfi).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rfis"] }); toast.success("RFI created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateRFI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"rfis"> & { id: string }) => {
      const { data, error } = await supabase.from("rfis").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rfis"] }); toast.success("RFI updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteRFI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rfis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rfis"] }); toast.success("RFI deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Submittals ───────────────────────────────────────────────────────────────

export function useSubmittals() {
  return useQuery({
    queryKey: ["submittals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("submittals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSubmittal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: TablesInsert<"submittals">) => {
      const { data, error } = await supabase.from("submittals").insert(s).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["submittals"] }); toast.success("Submittal created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSubmittal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"submittals"> & { id: string }) => {
      const { data, error } = await supabase.from("submittals").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["submittals"] }); toast.success("Submittal updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSubmittal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("submittals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["submittals"] }); toast.success("Submittal deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Change Orders ────────────────────────────────────────────────────────────

export function useChangeOrders() {
  return useQuery({
    queryKey: ["change_orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("change_orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateChangeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (co: TablesInsert<"change_orders">) => {
      const { data, error } = await supabase.from("change_orders").insert(co).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["change_orders"] }); toast.success("Change order created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateChangeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"change_orders"> & { id: string }) => {
      const { data, error } = await supabase.from("change_orders").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["change_orders"] }); toast.success("Change order updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteChangeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("change_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["change_orders"] }); toast.success("Change order deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Daily Reports ────────────────────────────────────────────────────────────

export function useDailyReports() {
  return useQuery({
    queryKey: ["daily_reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("daily_reports").select("*").order("report_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDailyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: TablesInsert<"daily_reports">) => {
      const { data, error } = await supabase.from("daily_reports").insert(r).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["daily_reports"] }); toast.success("Report submitted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDailyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"daily_reports"> & { id: string }) => {
      const { data, error } = await supabase.from("daily_reports").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["daily_reports"] }); toast.success("Report updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDailyReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["daily_reports"] }); toast.success("Report deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// Re-export Tables type for convenience
export type { Tables };
