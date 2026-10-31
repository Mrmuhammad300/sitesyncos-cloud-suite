import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, CircleDollarSign, Compass, Gauge, Play, RotateCcw, ShieldAlert, Sigma, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, Meter, PageHeader, Panel, StatusPill } from "@/components/os";
import { Shimmer } from "@/components/ai/primitives";
import { useProjects } from "@/hooks/useProjectData";
import { CHART, axisProps, gridProps, tooltipProps } from "@/lib/chart";
import { cn, fmtDollar } from "@/lib/utils";

/* ─── Model ──────────────────────────────────────────────────────────
 * Cost impact applies the labor (42%) and material (28%) shares of the
 * remaining cost-to-complete. With no project budgets it falls back to a
 * nominal $100K basis (the simulator's original unit).
 * ------------------------------------------------------------------- */
const LABOR_SHARE = 0.42;
const MATERIAL_SHARE = 0.28;
const NOMINAL_BASIS = 100_000;
const SAMPLES = 2000;

const TEMPLATES = {
  baseline: { label: "Baseline", labor: 0, material: 0, weather: 0 },
  optimistic: { label: "Optimistic", labor: -5, material: -4, weather: 0 },
  pessimistic: { label: "Pessimistic", labor: 8, material: 12, weather: 10 },
  supply_shock: { label: "Supply shock", labor: 3, material: 25, weather: 6 },
} as const;
type TemplateKey = keyof typeof TEMPLATES;

interface Params { labor: number; material: number; weather: number; scope: string }

interface Results {
  params: Params;
  basis: number;
  nominal: boolean;
  costImpact: number;
  scheduleImpact: number;
  riskScore: number;
  confidence: number;
  cost: { p10: number; p50: number; p90: number };
  days: { p10: number; p50: number; p90: number };
  pOverrun: number;
  histogram: { x: number; mid: number; count: number }[];
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];

function simulate(params: Params, basis: number, nominal: boolean): Results {
  const { labor, material, weather } = params;
  const costImpact = basis * (labor * LABOR_SHARE + material * MATERIAL_SHARE) / 100;
  const scheduleImpact = Math.round(weather * 1.5 + Math.abs(labor) * 0.3);
  const riskScore = Math.round(Math.min(100, Math.max(0, 35 + Math.abs(labor) + Math.abs(material) * 0.8 + weather * 2)));
  const confidence = Math.round(Math.max(60, 95 - Math.abs(labor) - Math.abs(material) * 0.5));

  // Monte Carlo around the point estimate; spread widens as confidence falls.
  const spread = 0.5 + ((100 - confidence) / 100) * 2.5;
  const sigmaC = (Math.abs(costImpact) * 0.3 + basis * 0.004) * spread;
  const sigmaD = (1 + scheduleImpact * 0.3) * spread;
  const rand = mulberry32(labor * 7919 + material * 104729 + weather * 1299709 + Math.round(basis / 1000));
  const normal = () => {
    const u = Math.max(rand(), 1e-9);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
  };
  const costs: number[] = [];
  const days: number[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const z = normal();
    costs.push(costImpact + z * sigmaC);
    days.push(Math.max(0, scheduleImpact + (0.6 * z + 0.8 * normal()) * sigmaD));
  }
  costs.sort((a, b) => a - b);
  days.sort((a, b) => a - b);

  const lo = costs[0];
  const hi = costs[costs.length - 1];
  const bins = 32;
  const w = (hi - lo) / bins || 1;
  const histogram = Array.from({ length: bins }, (_, i) => ({ x: lo + i * w, mid: lo + (i + 0.5) * w, count: 0 }));
  for (const c of costs) histogram[Math.min(bins - 1, Math.floor((c - lo) / w))].count++;

  return {
    params, basis, nominal, costImpact, scheduleImpact, riskScore, confidence,
    cost: { p10: quantile(costs, 0.1), p50: quantile(costs, 0.5), p90: quantile(costs, 0.9) },
    days: { p10: Math.round(quantile(days, 0.1)), p50: Math.round(quantile(days, 0.5)), p90: Math.round(quantile(days, 0.9)) },
    pOverrun: costs.filter((c) => c > 0).length / SAMPLES,
    histogram,
  };
}

const signed = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${fmtDollar(Math.abs(v))}`;
const signedPct = (v: number) => `${v > 0 ? "+" : ""}${v}%`;

export default function SimulatorPage() {
  const { data: projects = [], isLoading } = useProjects();
  const [laborChange, setLaborChange] = useState([0]);
  const [materialChange, setMaterialChange] = useState([0]);
  const [weatherDelay, setWeatherDelay] = useState([0]);
  const [scope, setScope] = useState("portfolio");
  const [results, setResults] = useState<Results | null>(null);

  const active = useMemo(() => projects.filter((p) => p.status !== "Complete"), [projects]);
  const inScope = useMemo(() => (scope === "portfolio" ? active : active.filter((p) => p.id === scope)), [active, scope]);
  const remaining = inScope.reduce((s, p) => s + Math.max(Number(p.budget) - Number(p.spent), 0), 0);
  const nominal = remaining <= 0;
  const basis = nominal ? NOMINAL_BASIS : remaining;

  const params: Params = { labor: laborChange[0], material: materialChange[0], weather: weatherDelay[0], scope };
  const scenario = (Object.keys(TEMPLATES) as TemplateKey[]).find((k) => {
    const t = TEMPLATES[k];
    return t.labor === params.labor && t.material === params.material && t.weather === params.weather;
  });
  const stale = !!results && (results.params.labor !== params.labor || results.params.material !== params.material || results.params.weather !== params.weather || results.params.scope !== params.scope);

  const applyTemplate = (k: TemplateKey) => {
    const t = TEMPLATES[k];
    setLaborChange([t.labor]);
    setMaterialChange([t.material]);
    setWeatherDelay([t.weather]);
  };

  const runSimulation = () => setResults(simulate(params, basis, nominal));
  const reset = () => { setLaborChange([0]); setMaterialChange([0]); setWeatherDelay([0]); setScope("portfolio"); setResults(null); };

  const projectImpact = useMemo(() => {
    if (!results || results.nominal) return [];
    const scoped = results.params.scope === "portfolio" ? active : active.filter((p) => p.id === results.params.scope);
    const total = scoped.reduce((s, p) => s + Math.max(Number(p.budget) - Number(p.spent), 0), 0) || 1;
    return scoped
      .map((p) => {
        const rem = Math.max(Number(p.budget) - Number(p.spent), 0);
        const impact = results.costImpact * (rem / total);
        const end = p.end_date ? new Date(p.end_date + "T00:00:00") : null;
        const shifted = end ? new Date(end.getTime() + results.scheduleImpact * 86_400_000) : null;
        return { id: p.id, name: p.name, rem, impact, budget: Number(p.budget), end, shifted };
      })
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
      .slice(0, 6);
  }, [results, active]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scenario simulator"
        description="Stress-test cost-to-complete and schedule against labor, material and weather shocks — 2,000 Monte Carlo runs per scenario."
        actions={
          <>
            <Button variant="outline" onClick={reset}><RotateCcw />Reset</Button>
            <Button onClick={runSimulation}><Play />Run simulation</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* ── Controls ── */}
        <Panel eyebrow="Inputs" title="Scenario" className="lg:sticky lg:top-6">
          <div className="space-y-6">
            <div className="space-y-2.5">
              <Label className="ss-eyebrow">Template</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(TEMPLATES) as TemplateKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => applyTemplate(k)}
                    aria-pressed={scenario === k}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-[13px] transition-colors",
                      scenario === k ? "border-primary/40 bg-primary/10 text-foreground" : "bg-surface-2/40 text-muted-foreground hover:border-border-strong hover:text-foreground",
                    )}
                  >
                    {TEMPLATES[k].label}
                  </button>
                ))}
              </div>
              {!scenario && <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">Custom mix</p>}
            </div>

            <div className="space-y-2.5">
              <Label className="ss-eyebrow">Scope</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="portfolio">Entire portfolio ({active.length} active)</SelectItem>
                  {active.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-baseline justify-between rounded-lg border border-dashed px-3 py-2">
                <span className="text-xs text-muted-foreground">Cost to complete</span>
                {isLoading ? <Shimmer className="h-4 w-16" /> : (
                  <span className="font-mono text-sm tabular-nums">{nominal ? "nominal $100K" : fmtDollar(remaining)}</span>
                )}
              </div>
            </div>

            <ParamSlider label="Labor cost" value={laborChange} onChange={setLaborChange} min={-30} max={30} format={signedPct} centered />
            <ParamSlider label="Material cost" value={materialChange} onChange={setMaterialChange} min={-30} max={30} format={signedPct} centered />
            <ParamSlider label="Weather delay" value={weatherDelay} onChange={setWeatherDelay} min={0} max={30} format={(v) => `${v}d`} />

            <Button className="w-full" onClick={runSimulation}><Play />{results ? "Re-run" : "Run"} simulation</Button>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Labor is modeled as {LABOR_SHARE * 100}% and materials as {MATERIAL_SHARE * 100}% of remaining cost. Each weather day adds ~1.5 schedule days.
            </p>
          </div>
        </Panel>

        {/* ── Outcomes ── */}
        <div className="min-w-0 space-y-3">
          {!results ? (
            <Panel>
              <EmptyState
                icon={Compass}
                title="Set a scenario, then run it"
                description="Pick a template or dial in your own shocks. We'll simulate 2,000 outcomes against your cost-to-complete and show the spread."
                action={<Button size="sm" onClick={runSimulation}><Play />Run simulation</Button>}
              />
            </Panel>
          ) : (
            <>
              {stale && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/25 bg-warning/5 px-4 py-2.5 text-[13px]">
                  <span className="h-1.5 w-1.5 animate-glow-pulse rounded-full bg-warning" />
                  Inputs changed since the last run.
                  <Button size="xs" variant="outline" className="ml-auto" onClick={runSimulation}><Play />Re-run</Button>
                </div>
              )}

              <Panel glow eyebrow={`Outcome · ${results.params.scope === "portfolio" ? "portfolio" : inScope[0]?.name ?? "project"}`} title="Median forecast" className={cn(stale && "opacity-70 transition-opacity")}>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <BigNumber
                    icon={CircleDollarSign}
                    label="Cost impact · P50"
                    value={signed(results.cost.p50)}
                    tone={results.cost.p50 > 0 ? "text-destructive" : results.cost.p50 < 0 ? "text-success" : ""}
                    sub={<>P10 {signed(results.cost.p10)} <span className="text-border-strong">/</span> P90 {signed(results.cost.p90)}</>}
                  />
                  <BigNumber
                    icon={CalendarClock}
                    label="Schedule impact · P50"
                    value={<>{results.days.p50 > 0 ? "+" : ""}{results.days.p50}<span className="ml-1 text-xl text-muted-foreground">days</span></>}
                    tone={results.days.p50 > 0 ? "text-warning" : ""}
                    sub={<>P10 {results.days.p10}d <span className="text-border-strong">/</span> P90 {results.days.p90}d</>}
                  />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border">
                  <MiniStat icon={ShieldAlert} label="Risk score">
                    <span className={cn(results.riskScore > 60 ? "text-destructive" : results.riskScore > 40 ? "text-warning" : "text-success")}>{results.riskScore}</span>
                    <span className="text-xs text-muted-foreground">/100</span>
                    <Meter value={results.riskScore} risk className="mt-2" />
                  </MiniStat>
                  <MiniStat icon={Gauge} label="Confidence">
                    {results.confidence}<span className="text-xs text-muted-foreground">%</span>
                    <Meter value={results.confidence} tone="data" className="mt-2" />
                  </MiniStat>
                  <MiniStat icon={TrendingUp} label="P(overrun)">
                    <span className={cn(results.pOverrun > 0.5 && "text-destructive")}>{Math.round(results.pOverrun * 100)}</span>
                    <span className="text-xs text-muted-foreground">%</span>
                    <Meter value={results.pOverrun * 100} tone={results.pOverrun > 0.5 ? "destructive" : "success"} className="mt-2" />
                  </MiniStat>
                </div>
              </Panel>

              <Panel
                eyebrow="Distribution"
                title="Cost outcomes across 2,000 runs"
                actions={
                  <span className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-success" />Savings</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-data" />Overrun</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-px bg-primary" />P50</span>
                  </span>
                }
              >
                <div className={cn("h-[240px]", stale && "opacity-70")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results.histogram} margin={{ top: 18, right: 8, left: -20, bottom: 0 }} barCategoryGap={1}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="mid" type="number" domain={["dataMin", "dataMax"]} {...axisProps} tickFormatter={(v) => signed(v)} tickCount={5} />
                      <YAxis {...axisProps} allowDecimals={false} />
                      <Tooltip
                        {...tooltipProps}
                        labelFormatter={(v: number) => `≈ ${signed(v)}`}
                        formatter={(v: number) => [`${v} runs (${((v / SAMPLES) * 100).toFixed(1)}%)`, "Frequency"]}
                      />
                      <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                        {results.histogram.map((b, i) => <Cell key={i} fill={b.mid < 0 ? CHART.success : CHART.data} fillOpacity={0.85} />)}
                      </Bar>
                      <ReferenceLine x={results.cost.p10} stroke={CHART.muted} strokeDasharray="3 3" label={{ value: "P10", position: "top", fill: CHART.muted, fontSize: 10 }} />
                      <ReferenceLine x={results.cost.p50} stroke={CHART.primary} strokeWidth={1.5} label={{ value: "P50", position: "top", fill: CHART.primary, fontSize: 10 }} />
                      <ReferenceLine x={results.cost.p90} stroke={CHART.muted} strokeDasharray="3 3" label={{ value: "P90", position: "top", fill: CHART.muted, fontSize: 10 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Panel>

              <Panel
                flush
                eyebrow="Exposure"
                title="Impact by project"
                actions={<StatusPill status={results.nominal ? "Nominal basis" : "Live budgets"} tone={results.nominal ? "neutral" : "data"} />}
              >
                {projectImpact.length === 0 ? (
                  <div className="p-5 pt-0">
                    <EmptyState compact icon={Sigma} title="No active project budgets" description="This run used a nominal $100K basis. Add projects with budgets to see per-project exposure." />
                  </div>
                ) : (
                  <ul className="divide-y divide-border/70 border-t">
                    {projectImpact.map((p) => (
                      <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_120px_110px_120px]">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium">{p.name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{fmtDollar(p.rem)} to complete</p>
                        </div>
                        <span className={cn("text-right font-mono text-[13px] tabular-nums", p.impact > 0 ? "text-destructive" : p.impact < 0 ? "text-success" : "")}>
                          {signed(p.impact)}
                        </span>
                        <span className="hidden text-right font-mono text-[11px] tabular-nums text-muted-foreground sm:block">
                          {p.budget > 0 ? `${p.impact >= 0 ? "+" : ""}${((p.impact / p.budget) * 100).toFixed(1)}% of budget` : "—"}
                        </span>
                        <span className="col-span-2 font-mono text-[11px] tabular-nums text-muted-foreground sm:col-span-1 sm:text-right">
                          {p.shifted ? (
                            <>
                              finish {p.shifted.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                              {results.scheduleImpact > 0 && <span className="text-warning"> +{results.scheduleImpact}d</span>}
                            </>
                          ) : "no end date"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Pieces ─────────────────────────────────────────────────────── */

function ParamSlider({
  label, value, onChange, min, max, format, centered,
}: { label: string; value: number[]; onChange: (v: number[]) => void; min: number; max: number; format: (v: number) => string; centered?: boolean }) {
  const v = value[0];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[13px]">{label}</Label>
        <span
          className={cn(
            "rounded-md border px-1.5 py-0.5 font-mono text-[12px] tabular-nums",
            v === 0 ? "text-muted-foreground" : v > 0 ? "border-warning/25 bg-warning/10 text-warning" : "border-success/25 bg-success/10 text-success",
          )}
        >
          {format(v)}
        </span>
      </div>
      <div className="relative">
        {centered && <span className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-3.5 w-px -translate-y-1/2 bg-border-strong" aria-hidden />}
        <Slider value={value} onValueChange={onChange} min={min} max={max} step={1} aria-label={label} />
      </div>
      <div className="flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground/80">
        <span>{format(min)}</span>
        {centered && <span>0</span>}
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function BigNumber({ icon: Icon, label, value, sub, tone }: { icon: React.ElementType; label: string; value: React.ReactNode; sub: React.ReactNode; tone?: string }) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="ss-eyebrow flex items-center gap-1.5"><Icon className="h-3 w-3" />{label}</p>
      <p className={cn("truncate font-mono text-[40px] font-medium leading-none tracking-[-0.04em] tabular-nums sm:text-[48px]", tone)}>{value}</p>
      <p className="font-mono text-[11.5px] tabular-nums text-muted-foreground">{sub}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 bg-card p-3">
      <p className="flex items-center gap-1 truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><Icon className="h-3 w-3 shrink-0" />{label}</p>
      <div className="mt-1 font-mono text-xl font-medium tabular-nums">{children}</div>
    </div>
  );
}
