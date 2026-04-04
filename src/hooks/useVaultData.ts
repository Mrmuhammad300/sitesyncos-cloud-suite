import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"] & { id: string };
type LenderInsert = Database["public"]["Tables"]["lenders"]["Insert"];
type LenderUpdate = Database["public"]["Tables"]["lenders"]["Update"] & { id: string };
type TreasuryInsert = Database["public"]["Tables"]["treasury_transactions"]["Insert"];
type TreasuryUpdate = Database["public"]["Tables"]["treasury_transactions"]["Update"] & { id: string };

// ─── Properties ───────────────────────────────────────────────────────────────

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
    mutationFn: async (p: PropertyInsert) => {
      const { data, error } = await supabase.from("properties").insert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["properties"] }); toast.success("Property added"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: PropertyUpdate) => {
      const { data, error } = await supabase.from("properties").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["properties"] }); toast.success("Property updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["properties"] }); toast.success("Property deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Lenders ──────────────────────────────────────────────────────────────────

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
    mutationFn: async (l: LenderInsert) => {
      const { data, error } = await supabase.from("lenders").insert(l).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lenders"] }); toast.success("Lender added"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateLender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: LenderUpdate) => {
      const { data, error } = await supabase.from("lenders").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lenders"] }); toast.success("Lender updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteLender() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lenders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lenders"] }); toast.success("Lender deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Treasury Transactions ────────────────────────────────────────────────────

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
    mutationFn: async (t: TreasuryInsert) => {
      const { data, error } = await supabase.from("treasury_transactions").insert(t).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["treasury_transactions"] }); toast.success("Transaction created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTreasuryTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TreasuryUpdate) => {
      const { data, error } = await supabase.from("treasury_transactions").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["treasury_transactions"] }); toast.success("Transaction updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTreasuryTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("treasury_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["treasury_transactions"] }); toast.success("Transaction deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}
