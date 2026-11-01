import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, RefreshCw, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AiInsightCardProps {
  type: "daily-report-summary" | "budget-monitor" | "project-health";
  title: string;
  agentName: string;
  icon?: React.ReactNode;
}

const providerLabels: Record<string, { label: string; color: string }> = {
  lovable: { label: "Gemini", color: "border-data/30 text-data" },
  claude: { label: "Claude", color: "border-primary/30 text-primary" },
};

export function AiInsightCard({ type, title, agentName, icon }: AiInsightCardProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<"lovable" | "claude">("lovable");
  const [usedProvider, setUsedProvider] = useState<string | null>(null);

  const fetchInsight = async (selectedProvider: "lovable" | "claude" = provider) => {
    setLoading(true);
    setInsight(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-insights", {
        body: { type, provider: selectedProvider },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setInsight(data.insight);
      setUsedProvider(data.provider);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to get AI insight");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="ss-card relative overflow-hidden">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-mod-ai/10 blur-3xl" />
      <div className="relative flex items-center justify-between gap-3 px-5 pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-surface-2">
            {icon ?? <Brain className="h-4 w-4 text-mod-ai" />}
          </span>
          <div className="min-w-0">
            <p className="ss-eyebrow">AI insight</p>
            <h3 className="truncate text-[14px] font-semibold tracking-tight">{title}</h3>
          </div>
        </div>
        <Badge variant="outline" className="font-mono">{agentName}</Badge>
      </div>
      <div className="relative space-y-3 p-5 pt-4">
        {!insight && !loading && (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-muted-foreground">
              Run a live analysis of your portfolio with {agentName}. Results are generated on demand from current data.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => { setProvider("claude"); fetchInsight("claude"); }}>
                <Zap /> Analyze with Claude
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setProvider("lovable"); fetchInsight("lovable"); }}>
                <Sparkles /> Gemini
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="space-y-2 py-1" role="status">
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
              {agentName} is analyzing…
            </div>
            {[92, 78, 85].map((w, i) => (
              <div key={i} className="h-3 animate-shimmer rounded bg-[linear-gradient(90deg,hsl(var(--muted))_0%,hsl(var(--surface-3))_50%,hsl(var(--muted))_100%)] bg-[length:200%_100%]" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {insight && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {usedProvider && (
                <Badge variant="outline" className={providerLabels[usedProvider]?.color ?? ""}>
                  {providerLabels[usedProvider]?.label ?? usedProvider}
                </Badge>
              )}
              <Button size="xs" variant="ghost" className="ml-auto" onClick={() => fetchInsight()}>
                <RefreshCw /> Refresh
              </Button>
            </div>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-[13px] leading-relaxed dark:prose-invert">
              {insight}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
