import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";

export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: TablesInsert<"budgets">) => {
      const { data, error } = await supabase.from("budgets").insert(b).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budgets"] }); toast.success("Budget created"); },
    onError: (e) => toast.error(e.message),
  });
}

export function useDrawRequests() {
  return useQuery({
    queryKey: ["draw_requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("draw_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDrawRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: TablesInsert<"draw_requests">) => {
      const { data, error } = await supabase.from("draw_requests").insert(d).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["draw_requests"] }); toast.success("Draw request created"); },
    onError: (e) => toast.error(e.message),
  });
}

export function useTenants() {
  return useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: TablesInsert<"tenants">) => {
      const { data, error } = await supabase.from("tenants").insert(t).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast.success("Tenant added"); },
    onError: (e) => toast.error(e.message),
  });
}

export function useWorkOrders() {
  return useQuery({
    queryKey: ["work_orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("work_orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (w: TablesInsert<"work_orders">) => {
      const { data, error } = await supabase.from("work_orders").insert(w).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_orders"] }); toast.success("Work order created"); },
    onError: (e) => toast.error(e.message),
  });
}

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (d: TablesInsert<"documents">) => {
      const { data, error } = await supabase.from("documents").insert(d).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); toast.success("Document added"); },
    onError: (e) => toast.error(e.message),
  });
}
