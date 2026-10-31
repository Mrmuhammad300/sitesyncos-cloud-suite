import { useState } from "react";
import { Check, Inbox, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/os";
import { cn } from "@/lib/utils";
import { confidencePct, humanize, timeAgo } from "./agent-meta";
import { Confidence, RiskFlags } from "./primitives";
import { isPendingApproval, useApprovalMutation } from "./approvals";

type Execution = Tables<"agent_executions">;

interface ApprovalQueueProps {
  executions: Execution[] | undefined;
  agentName?: (agentId: string) => string;
  /** Collapse feedback fields until a card is focused — for side rails. */
  compact?: boolean;
  limit?: number;
}

export function ApprovalQueue({ executions, agentName = (a) => a, compact, limit }: ApprovalQueueProps) {
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const approval = useApprovalMutation(executions);
  const pending = (executions ?? []).filter(isPendingApproval);
  const shown = limit ? pending.slice(0, limit) : pending;

  if (pending.length === 0) {
    return (
      <EmptyState
        compact
        icon={Inbox}
        title="Approval queue is clear"
        description="When an agent drafts an action that needs a human sign-off, it lands here."
      />
    );
  }

  return (
    <ul className="space-y-2.5">
      {shown.map((exec) => {
        const expanded = !compact || open === exec.id;
        const busy = approval.isPending && approval.variables?.id === exec.id;
        return (
          <li
            key={exec.id}
            className={cn(
              "group rounded-xl border bg-surface-2/40 p-3.5 transition-colors",
              expanded && compact && "border-border-strong bg-surface-2/70",
            )}
          >
            <button
              type="button"
              className="flex w-full items-start gap-3 text-left"
              onClick={() => compact && setOpen((o) => (o === exec.id ? null : exec.id))}
              aria-expanded={compact ? expanded : undefined}
            >
              <span className="mt-1 flex h-1.5 w-1.5 shrink-0 rounded-full bg-warning shadow-[0_0_0_3px_hsl(var(--warning)/0.15)]" />
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-[13px] font-medium">{agentName(exec.agent_id)}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{exec.event_type}</span>
                </span>
                {exec.reasoning && <span className="line-clamp-2 block text-xs text-muted-foreground">{exec.reasoning}</span>}
                <span className="flex flex-wrap items-center gap-2 pt-0.5">
                  <Confidence value={confidencePct(exec.confidence_score)} />
                  <RiskFlags flags={exec.risk_flags} />
                  <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">{timeAgo(exec.created_at)}</span>
                </span>
              </span>
            </button>

            {expanded && (
              <div className="mt-3 space-y-2 pl-[18px]">
                <Textarea
                  placeholder="Feedback for the agent (optional)…"
                  className="min-h-[60px] text-xs"
                  value={feedbackText[exec.id] ?? ""}
                  onChange={(e) => setFeedbackText((p) => ({ ...p, [exec.id]: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => approval.mutate({ id: exec.id, status: "approved", feedback: feedbackText[exec.id] })}
                  >
                    <Check />Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={busy}
                    onClick={() => approval.mutate({ id: exec.id, status: "rejected", feedback: feedbackText[exec.id] })}
                  >
                    <X />Reject
                  </Button>
                  <span className="ml-auto self-center truncate font-mono text-[10.5px] text-muted-foreground">{humanize(exec.execution_id)}</span>
                </div>
              </div>
            )}
          </li>
        );
      })}
      {limit && pending.length > limit && (
        <li className="pt-1 text-center font-mono text-[11px] text-muted-foreground">+{pending.length - limit} more waiting</li>
      )}
    </ul>
  );
}
