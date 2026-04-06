import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { uploadFile, buildStoragePath, formatFileSize } from "@/lib/storage";
import { toast } from "sonner";

export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("budgets").select("*").order("created_at", { ascending: false }).limit(500);
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
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDrawRequests() {
  return useQuery({
    queryKey: ["draw_requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("draw_requests").select("*").order("created_at", { ascending: false }).limit(500);
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
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDrawRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"draw_requests"> & { id: string }) => {
      const { data, error } = await supabase.from("draw_requests").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["draw_requests"] }); toast.success("Draw request updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTenants() {
  return useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("*").order("created_at", { ascending: false }).limit(500);
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
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useWorkOrders() {
  return useQuery({
    queryKey: ["work_orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("work_orders").select("*").order("created_at", { ascending: false }).limit(500);
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
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data;
    },
  });
}

interface CreateDocumentPayload extends TablesInsert<"documents"> {
  file?: File;
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, ...d }: CreateDocumentPayload) => {
      let file_url: string | null = d.file_url ?? null;
      let file_size: string | null = d.file_size ?? null;

      if (file) {
        const path = buildStoragePath("documents", file);
        file_url = await uploadFile("documents", path, file);
        file_size = formatFileSize(file.size);
      }

      const { data, error } = await supabase
        .from("documents")
        .insert({ ...d, file_url, file_size })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); toast.success("Document uploaded"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

interface UpdateDocumentPayload extends TablesUpdate<"documents"> {
  id: string;
  file?: File;
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file, ...updates }: UpdateDocumentPayload) => {
      let file_url = updates.file_url;
      let file_size = updates.file_size;

      if (file) {
        const path = buildStoragePath("documents", file);
        file_url = await uploadFile("documents", path, file);
        file_size = formatFileSize(file.size);
      }

      const { data, error } = await supabase
        .from("documents")
        .update({ ...updates, file_url, file_size })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); toast.success("Document updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budgets"] }); toast.success("Budget deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDrawRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("draw_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["draw_requests"] }); toast.success("Draw request deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast.success("Tenant deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"work_orders"> & { id: string }) => {
      const { data, error } = await supabase.from("work_orders").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_orders"] }); toast.success("Work order updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["work_orders"] }); toast.success("Work order deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); toast.success("Document deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}
