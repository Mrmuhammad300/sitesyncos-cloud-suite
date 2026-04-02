import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, RotateCcw, TrendingUp, Clock, DollarSign, AlertTriangle } from "lucide-react";

export default function SimulatorPage() {
  const [laborChange, setLaborChange] = useState([0]);
  const [materialChange, setMaterialChange] = useState([0]);
  const [weatherDelay, setWeatherDelay] = useState([0]);
  const [scenario, setScenario] = useState("baseline");
  const [results, setResults] = useState<null | { costImpact: number; scheduleImpact: number; riskScore: number; confidence: number }>(null);

  const runSimulation = () => {
    const costImpact = (laborChange[0] * 0.42 + materialChange[0] * 0.28) * 1000;
    const scheduleImpact = Math.round(weatherDelay[0] * 1.5 + Math.abs(laborChange[0]) * 0.3);
    const riskScore = Math.min(100, Math.max(0, 35 + Math.abs(laborChange[0]) + Math.abs(materialChange[0]) * 0.8 + weatherDelay[0] * 2));
    const confidence = Math.max(60, 95 - Math.abs(laborChange[0]) - Math.abs(materialChange[0]) * 0.5);
    setResults({ costImpact, scheduleImpact, riskScore: Math.round(riskScore), confidence: Math.round(confidence) });
  };

  const reset = () => { setLaborChange([0]); setMaterialChange([0]); setWeatherDelay([0]); setScenario("baseline"); setResults(null); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Scenario Simulator</h1>
            <Badge variant="outline" className="text-[10px]">AI & Intelligence</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Run what-if scenarios for cost and schedule impact</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={reset}><RotateCcw className="h-4 w-4 mr-1" />Reset</Button>
          <Button size="sm" onClick={runSimulation}><Play className="h-4 w-4 mr-1" />Run Simulation</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Parameters</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Scenario Template</Label>
              </div>
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
              <div className="flex items-center justify-between"><Label>Labor Cost Change</Label><span className="text-sm font-mono text-muted-foreground">{laborChange[0] > 0 ? "+" : ""}{laborChange[0]}%</span></div>
              <Slider value={laborChange} onValueChange={setLaborChange} min={-30} max={30} step={1} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between"><Label>Material Cost Change</Label><span className="text-sm font-mono text-muted-foreground">{materialChange[0] > 0 ? "+" : ""}{materialChange[0]}%</span></div>
              <Slider value={materialChange} onValueChange={setMaterialChange} min={-30} max={30} step={1} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between"><Label>Weather Delay (days)</Label><span className="text-sm font-mono text-muted-foreground">{weatherDelay[0]}d</span></div>
              <Slider value={weatherDelay} onValueChange={setWeatherDelay} min={0} max={30} step={1} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Simulation Results</CardTitle></CardHeader>
          <CardContent>
            {!results ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Play className="h-8 w-8 mb-3 opacity-50" />
                <p className="text-sm">Adjust parameters and click "Run Simulation"</p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
