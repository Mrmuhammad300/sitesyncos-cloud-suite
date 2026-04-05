import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FloorPlan {
  id: string;
  project_id: string | null;
  level_name: string;
  level_number: number;
  area_sqft: number | null;
  room_count: number;
  status: "Draft" | "In Review" | "Final";
  layout_json: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface FloorPlanRoom {
  id: string;
  floor_plan_id: string;
  name: string;
  room_type: string;
  area_sqft: number | null;
  dimensions: string | null;
  created_at: string;
}

export function useFloorPlans(projectId?: string) {
  return useQuery({
    queryKey: ["floor_plans", projectId],
    queryFn: async () => {
      let q = supabase
        .from("floor_plans" as never)
        .select("*")
        .order("level_number", { ascending: true });
      if (projectId) q = (q as ReturnType<typeof supabase.from>).eq("project_id", projectId) as typeof q;
      const { data, error } = await q;
      if (error) throw error;
      return data as FloorPlan[];
    },
  });
}

export function useFloorPlanRooms(floorPlanId: string | null) {
  return useQuery({
    queryKey: ["floor_plan_rooms", floorPlanId],
    enabled: !!floorPlanId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("floor_plan_rooms" as never)
        .select("*")
        .eq("floor_plan_id", floorPlanId!)
        .order("name");
      if (error) throw error;
      return data as FloorPlanRoom[];
    },
  });
}

export function useCreateFloorPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: Omit<FloorPlan, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase.from("floor_plans" as never).insert(plan).select().single();
      if (error) throw error;
      return data as FloorPlan;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["floor_plans"] }); toast.success("Floor plan created"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateFloorPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FloorPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from("floor_plans" as never)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as FloorPlan;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["floor_plans"] }); toast.success("Floor plan updated"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteFloorPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("floor_plans" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["floor_plans"] }); toast.success("Floor plan deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
}
