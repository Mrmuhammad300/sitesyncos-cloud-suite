import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Properties
export function useProperties() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: any) => {
      const { data, error } = await supabase.from("properties").insert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["properties"] }); toast.success("Property added"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from("properties").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["properties"] }); toast.success("Property updated"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// Lenders
export function useLenders() {
  return useQuery({
    queryKey: ["lenders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lenders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (l: any) => {
      const { data, error } = await supabase.from("lenders").insert(l).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lenders"] }); toast.success("Lender added"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateLender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from("lenders").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lenders"] }); toast.success("Lender updated"); },
    onError: (e: any) => toast.error(e.message),
  });
}

// Treasury Transactions
export function useTreasuryTransactions() {
  return useQuery({
    queryKey: ["treasury_transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("treasury_transactions").select("*").order("txn_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTreasuryTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: any) => {
      const { data, error } = await supabase.from("treasury_transactions").insert(t).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["treasury_transactions"] }); toast.success("Transaction created"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateTreasuryTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase.from("treasury_transactions").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["treasury_transactions"] }); toast.success("Transaction updated"); },
    onError: (e: any) => toast.error(e.message),
  });
}
