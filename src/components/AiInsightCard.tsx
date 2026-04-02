import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  lovable: { label: "Gemini", color: "border-primary/30 text-primary" },
  claude: { label: "Claude", color: "border-purple-500/30 text-purple-500" },
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
    } catch (e: any) {
      toast.error(e.message ?? "Failed to get AI insight");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/10 bg-gradient-to-br from-background to-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon ?? <Brain className="h-4 w-4 text-primary" />}
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">
            {agentName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!insight && !loading && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Get AI-powered analysis from {agentName}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                className="text-xs h-7"
                onClick={() => { setProvider("lovable"); fetchInsight("lovable"); }}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Analyze (Gemini)
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7"
                onClick={() => { setProvider("claude"); fetchInsight("claude"); }}
              >
                <Zap className="h-3 w-3 mr-1" />
                Analyze (Claude)
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-4">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">{agentName} analyzing…</span>
          </div>
        )}

        {insight && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              {usedProvider && (
                <Badge variant="outline" className={`text-[10px] ${providerLabels[usedProvider]?.color ?? ""}`}>
                  {providerLabels[usedProvider]?.label ?? usedProvider}
                </Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] ml-auto"
                onClick={() => fetchInsight()}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
              {insight}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
