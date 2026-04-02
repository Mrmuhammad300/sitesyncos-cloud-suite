import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";

// Projects
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
    onError: (e) => toast.error(e.message),
  });
}

// RFIs
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
    onError: (e) => toast.error(e.message),
  });
}

// Submittals
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
    onError: (e) => toast.error(e.message),
  });
}

// Change Orders
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
    onError: (e) => toast.error(e.message),
  });
}

// Daily Reports
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
    onError: (e) => toast.error(e.message),
  });
}
