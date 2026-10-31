import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Execution = Tables<"agent_executions">;

export function isPendingApproval(e: Pick<Execution, "requires_approval" | "approval_status">) {
  return !!e.requires_approval && e.approval_status !== "approved" && e.approval_status !== "rejected";
}

/** Approve/reject mutation — records the decision and a learning signal. */
export function useApprovalMutation(executions: Execution[] | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, feedback }: { id: string; status: "approved" | "rejected"; feedback?: string }) => {
      const { error } = await supabase
        .from("agent_executions")
        .update({ approval_status: status, approval_feedback: feedback ?? null })
        .eq("id", id);
      if (error) throw error;

      const exec = executions?.find((e) => e.id === id);
      if (exec) {
        const { error: sigError } = await supabase.from("agent_learning_signals").insert({
          execution_id: exec.execution_id,
          agent_id: exec.agent_id,
          signal_type: "approval",
          is_positive: status === "approved",
          feedback: feedback ?? null,
        });
        if (sigError) console.error("Learning signal error:", sigError);
      }
    },
    onSuccess: () => {
      toast.success("Decision recorded");
      queryClient.invalidateQueries({ queryKey: ["agent_executions"] });
      queryClient.invalidateQueries({ queryKey: ["agent_learning_signals"] });
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't record that decision"),
  });
}
