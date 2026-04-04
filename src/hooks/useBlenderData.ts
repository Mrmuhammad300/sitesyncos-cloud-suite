import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

const BLENDER_API_URL = import.meta.env.VITE_BLENDER_API_URL ?? "http://localhost:3999";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BlenderJob = Tables<"blender_jobs">;
export type BlenderJobType = BlenderJob["job_type"];
export type BlenderJobStatus = BlenderJob["status"];
export type GeneratedModel = Tables<"generated_models">;
export type FloorPlanVariant = Tables<"floor_plan_variants">;
export type FloorPlanVariantStatus = FloorPlanVariant["status"];

// ─── Blender Jobs ─────────────────────────────────────────────────────────────

export function useBlenderJobs(projectId?: string) {
  return useQuery({
    queryKey: ["blender_jobs", projectId],
    queryFn: async () => {
      let q = supabase
        .from("blender_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

export function useBlenderJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ["blender_job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from("blender_jobs")
        .select("*")
        .eq("id", jobId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const job = query.state.data as BlenderJob | null;
      if (!job) return 2000;
      return job.status === "pending" || job.status === "processing" ? 2000 : false;
    },
  });
}

export function useCreateBlenderJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      job_type: BlenderJobType;
      prompt?: string;
      project_id?: string;
      file?: File;
    }) => {
      const insert: TablesInsert<"blender_jobs"> = {
        job_type: payload.job_type,
        prompt: payload.prompt ?? null,
        project_id: payload.project_id ?? null,
        status: "pending",
      };
      const { data: job, error } = await supabase
        .from("blender_jobs")
        .insert(insert)
        .select()
        .single();
      if (error) throw error;

      // Fire-and-forget POST to backend API
      try {
        const form = new FormData();
        form.append("job_id", job.id);
        form.append("job_type", payload.job_type);
        if (payload.prompt) form.append("prompt", payload.prompt);
        if (payload.project_id) form.append("project_id", payload.project_id);
        if (payload.file) form.append("file", payload.file);

        fetch(`${BLENDER_API_URL}/api/blender/process`, {
          method: "POST",
          body: form,
        }).catch(() => {
          toast.info("Blender service offline — job queued for when service starts.");
        });
      } catch {
        // Ignore fetch errors; job is recorded
      }

      return job;
    },
    onSuccess: (job) => {
      qc.invalidateQueries({ queryKey: ["blender_jobs"] });
      toast.success(`${job.job_type} job queued (#${job.id.slice(0, 8)})`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Generated Models ─────────────────────────────────────────────────────────

export function useGeneratedModels(jobId?: string) {
  return useQuery({
    queryKey: ["generated_models", jobId],
    queryFn: async () => {
      let q = supabase
        .from("generated_models")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (jobId) q = q.eq("blender_job_id", jobId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: true,
    staleTime: 60_000,
  });
}

// ─── Floor Plan Variants ──────────────────────────────────────────────────────

export function useFloorPlanVariants(projectId?: string) {
  return useQuery({
    queryKey: ["floor_plan_variants", projectId],
    queryFn: async () => {
      let q = supabase
        .from("floor_plan_variants")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
}

export function useUpdateFloorPlanVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: TablesUpdate<"floor_plan_variants"> & { id: string }) => {
      const { id, ...updates } = vars;
      const { error } = await supabase
        .from("floor_plan_variants")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["floor_plan_variants"] });
      toast.success("Floor plan variant updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
