import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const BLENDER_API_URL = import.meta.env.VITE_BLENDER_API_URL ?? "http://localhost:3999";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BlenderJobType = "generate" | "clash" | "floor-plan" | "design-iterate";
export type BlenderJobStatus = "pending" | "processing" | "completed" | "failed";
export type FloorPlanVariantStatus = "draft" | "approved" | "rejected";

export interface BlenderJob {
  id: string;
  user_id: string | null;
  project_id: string | null;
  job_type: BlenderJobType;
  prompt: string | null;
  status: BlenderJobStatus;
  result_url: string | null;
  result_metadata: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedModel {
  id: string;
  blender_job_id: string | null;
  model_name: string;
  file_format: "glb" | "gltf" | "png" | "svg";
  file_url: string;
  thumbnail_url: string | null;
  layers: Array<{ name: string; visible: boolean; color: string }> | null;
  bounds: { width: number; height: number; depth: number } | null;
  element_count: number | null;
  created_at: string;
}

export interface FloorPlanVariant {
  id: string;
  project_id: string | null;
  blender_job_id: string | null;
  variant_number: number;
  variant_name: string | null;
  layout_json: {
    rooms: Array<{ name: string; type: string; area: number; x: number; y: number; width: number; height: number }>;
    walls: Array<{ x1: number; y1: number; x2: number; y2: number }>;
    dimensions: { total_width: number; total_height: number };
  };
  metrics: { total_area: number; efficiency_ratio: number; room_count: number } | null;
  status: FloorPlanVariantStatus;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Blender Jobs ─────────────────────────────────────────────────────────────

export function useBlenderJobs(projectId?: string) {
  return useQuery({
    queryKey: ["blender_jobs", projectId],
    queryFn: async () => {
      let q = supabase
        .from("blender_jobs" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (projectId) q = (q as ReturnType<typeof q.eq>).eq("project_id", projectId) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return data as BlenderJob[];
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
        .from("blender_jobs" as never)
        .select("*")
        .eq("id", jobId)
        .single();
      if (error) throw error;
      return data as BlenderJob;
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
      // Insert job record into Supabase first
      const { data: job, error } = await supabase
        .from("blender_jobs" as never)
        .insert({
          job_type: payload.job_type,
          prompt: payload.prompt ?? null,
          project_id: payload.project_id ?? null,
          status: "pending",
        } as never)
        .select()
        .single();
      if (error) throw error;

      // Fire-and-forget POST to backend API (non-blocking; status polled via useBlenderJobStatus)
      try {
        const form = new FormData();
        form.append("job_id", (job as BlenderJob).id);
        form.append("job_type", payload.job_type);
        if (payload.prompt) form.append("prompt", payload.prompt);
        if (payload.project_id) form.append("project_id", payload.project_id);
        if (payload.file) form.append("file", payload.file);

        fetch(`${BLENDER_API_URL}/api/blender/process`, {
          method: "POST",
          body: form,
        }).catch(() => {
          // Backend offline — job stays in "pending" for when service comes online
          toast.info("Blender service offline — job queued for when service starts.");
        });
      } catch {
        // Ignore fetch errors; job is recorded
      }

      return job as BlenderJob;
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
        .from("generated_models" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (jobId) q = (q as ReturnType<typeof q.eq>).eq("blender_job_id", jobId) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return data as GeneratedModel[];
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
        .from("floor_plan_variants" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (projectId) q = (q as ReturnType<typeof q.eq>).eq("project_id", projectId) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return data as FloorPlanVariant[];
    },
    staleTime: 60_000,
  });
}

export function useUpdateFloorPlanVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: FloorPlanVariantStatus; notes?: string }) => {
      const { error } = await supabase
        .from("floor_plan_variants" as never)
        .update({ status, notes: notes ?? null } as never)
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
