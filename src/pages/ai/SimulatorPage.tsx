import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, RotateCcw, TrendingUp, Clock, DollarSign, AlertTriangle, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SimulationResult {
  costImpact: number;
  scheduleImpact: number;
  riskScore: number;
  confidence: number;
  baseBudget: number;
  dataPoints: number;
}

export default function SimulatorPage() {
  const [laborChange, setLaborChange] = useState([0]);
  const [materialChange, setMaterialChange] = useState([0]);
  const [weatherDelay, setWeatherDelay] = useState([0]);
  const [scenario, setScenario] = useState("baseline");

  const simulation = useMutation({
    mutationFn: async (): Promise<SimulationResult> => {
      const { data, error } = await supabase.functions.invoke("run-simulation", {
        body: {
          laborChange: laborChange[0],
          materialChange: materialChange[0],
          weatherDelay: weatherDelay[0],
          scenario,
        },
      });
      if (error) throw error;
      return data as SimulationResult;
    },
    onError: (e: Error) => toast.error(`Simulation failed: ${e.message}`),
  });

  const results = simulation.data ?? null;

  const reset = () => {
    setLaborChange([0]);
    setMaterialChange([0]);
    setWeatherDelay([0]);
    setScenario("baseline");
    simulation.reset();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Scenario Simulator</h1>
            <Badge variant="outline" className="text-[10px]">AI & Intelligence</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Run what-if scenarios calibrated against your real portfolio data</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={reset} disabled={simulation.isPending}><RotateCcw className="h-4 w-4 mr-1" />Reset</Button>
          <Button size="sm" onClick={() => simulation.mutate()} disabled={simulation.isPending}>
            <Play className="h-4 w-4 mr-1" />{simulation.isPending ? "Running..." : "Run Simulation"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Parameters</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Scenario Template</Label>
              <Select value={scenario} onValueChange={setScenario}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baseline">Baseline</SelectItem>
                  <SelectItem value="optimistic">Optimistic</SelectItem>
                  <SelectItem value="pessimistic">Pessimistic</SelectItem>
                  <SelectItem value="supply_shock">Supply Chain Shock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Labor Cost Change</Label>
                <span className="text-sm font-mono text-muted-foreground">{laborChange[0] > 0 ? "+" : ""}{laborChange[0]}%</span>
              </div>
              <Slider value={laborChange} onValueChange={setLaborChange} min={-30} max={30} step={1} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Material Cost Change</Label>
                <span className="text-sm font-mono text-muted-foreground">{materialChange[0] > 0 ? "+" : ""}{materialChange[0]}%</span>
              </div>
              <Slider value={materialChange} onValueChange={setMaterialChange} min={-30} max={30} step={1} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Weather Delay (days)</Label>
                <span className="text-sm font-mono text-muted-foreground">{weatherDelay[0]}d</span>
              </div>
              <Slider value={weatherDelay} onValueChange={setWeatherDelay} min={0} max={30} step={1} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Simulation Results</CardTitle></CardHeader>
          <CardContent>
            {simulation.isPending ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="h-8 w-8 mb-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm">Calculating against portfolio data…</p>
              </div>
            ) : !results ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Play className="h-8 w-8 mb-3 opacity-50" />
                <p className="text-sm">Adjust parameters and click "Run Simulation"</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-dashed">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><DollarSign className="h-3.5 w-3.5" />Cost Impact</div>
                      <p className={`text-xl font-bold font-mono ${results.costImpact > 0 ? "text-red-500" : results.costImpact < 0 ? "text-emerald-500" : ""}`}>
                        {results.costImpact > 0 ? "+" : ""}${Math.abs(results.costImpact).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Clock className="h-3.5 w-3.5" />Schedule Impact</div>
                      <p className={`text-xl font-bold font-mono ${results.scheduleImpact > 0 ? "text-amber-500" : ""}`}>
                        {results.scheduleImpact > 0 ? "+" : ""}{results.scheduleImpact} days
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><AlertTriangle className="h-3.5 w-3.5" />Risk Score</div>
                      <p className={`text-xl font-bold font-mono ${results.riskScore > 60 ? "text-red-500" : results.riskScore > 40 ? "text-amber-500" : "text-emerald-500"}`}>
                        {results.riskScore}/100
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-dashed">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><TrendingUp className="h-3.5 w-3.5" />Confidence</div>
                      <p className="text-xl font-bold font-mono">{results.confidence}%</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1 border-t">
                  <Database className="h-3 w-3" />
                  Calibrated from {results.dataPoints} real portfolio records · Base avg budget ${results.baseBudget.toLocaleString()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
