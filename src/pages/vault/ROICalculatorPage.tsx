import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, Landmark, RotateCcw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Meter, PageHeader, Panel } from "@/components/os";
import { useProperties } from "@/hooks/useVaultData";
import { cn, fmtDollar } from "@/lib/utils";
import { CHART, axisProps, gridProps, tooltipProps } from "@/lib/chart";
import { EXIT_LOAN_BALANCE, finite, runRoiModel } from "@/components/vault/roiModel";

const DEFAULTS = {
  purchasePrice: 10000000, noi: 650000, holdPeriod: 7, exitCapRate: 6.0, noiGrowth: 3.0,
  discountRate: 10.0, loanToValue: 70, interestRate: 5.5,
};

const CAP_STEPS = [-1, -0.5, 0, 0.5, 1];
const GROWTH_STEPS = [-1, -0.5, 0, 0.5, 1];

function SliderRow({ label, value, display, min, max, step, onChange, hint }: {
  label: string; value: number; display: string; min: number; max: number; step: number;
  onChange: (v: number) => void; hint?: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="font-mono text-sm tabular-nums text-foreground">{display}</span>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} aria-label={label} />
      {hint && <p className="font-mono text-[10.5px] tabular-nums text-muted-foreground">{hint}</p>}
    </div>
  );
}

function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">$</span>
        <Input type="number" inputMode="numeric" value={value} onChange={(e) => onChange(+e.target.value)} className="h-10 pl-7 font-mono tabular-nums" />
      </div>
      <p className="text-right font-mono text-[10.5px] tabular-nums text-muted-foreground">{fmtDollar(value)}</p>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4 border-t pt-4 first:border-t-0 first:pt-0">
      <p className="ss-eyebrow text-[9.5px]">{title}</p>
      {children}
    </div>
  );
}

export default function ROICalculatorPage() {
  const { data: properties, isLoading } = useProperties();
  const [params] = useSearchParams();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(() => params.get("property") ?? "custom");

  const [purchasePrice, setPurchasePrice] = useState(DEFAULTS.purchasePrice);
  const [noi, setNoi] = useState(DEFAULTS.noi);
  const [holdPeriod, setHoldPeriod] = useState(DEFAULTS.holdPeriod);
  const [exitCapRate, setExitCapRate] = useState(DEFAULTS.exitCapRate);
  const [noiGrowth, setNoiGrowth] = useState(DEFAULTS.noiGrowth);
  const [discountRate, setDiscountRate] = useState(DEFAULTS.discountRate);
  const [loanToValue, setLoanToValue] = useState(DEFAULTS.loanToValue);
  const [interestRate, setInterestRate] = useState(DEFAULTS.interestRate);

  useEffect(() => {
    if (selectedPropertyId === "custom" || !properties) return;
    const prop = properties.find((p) => p.id === selectedPropertyId);
    if (!prop) return;
    setPurchasePrice(Number(prop.price) || 10000000);
    setNoi(Number(prop.noi) || 650000);
    if (prop.cap_rate && Number(prop.cap_rate) > 0) setExitCapRate(Number(prop.cap_rate));
    if (prop.irr && Number(prop.irr) > 0) setDiscountRate(Number(prop.irr));
  }, [selectedPropertyId, properties]);

  const reset = () => {
    setSelectedPropertyId("custom");
    setPurchasePrice(DEFAULTS.purchasePrice); setNoi(DEFAULTS.noi); setHoldPeriod(DEFAULTS.holdPeriod);
    setExitCapRate(DEFAULTS.exitCapRate); setNoiGrowth(DEFAULTS.noiGrowth); setDiscountRate(DEFAULTS.discountRate);
    setLoanToValue(DEFAULTS.loanToValue); setInterestRate(DEFAULTS.interestRate);
  };

  const inputs = { purchasePrice, noi, holdPeriod, exitCapRate, noiGrowth, discountRate, loanToValue, interestRate };
  const r = runRoiModel(inputs);

  // IRR sensitivity: exit cap (rows) × NOI growth (columns), everything else held constant.
  const sensitivity = useMemo(
    () => CAP_STEPS.map((dc) => ({
      cap: exitCapRate + dc,
      cells: GROWTH_STEPS.map((dg) => {
        const cap = exitCapRate + dc;
        const g = noiGrowth + dg;
        if (cap <= 0) return { g, irr: NaN };
        return { g, irr: runRoiModel({ ...inputs, exitCapRate: cap, noiGrowth: g }).irr };
      }),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [purchasePrice, noi, holdPeriod, exitCapRate, noiGrowth, discountRate, loanToValue, interestRate],
  );

  const spread = (r.irr - discountRate) * 100; // bps over hurdle
  const clears = Number.isFinite(spread) && spread >= 0;
  const chartData = r.years.map((y) => ({
    ...y,
    equityOut: y.year === 0 ? y.total : 0,
    operatingIn: y.year > 0 ? y.operating : 0,
  }));
  const loaded = selectedPropertyId !== "custom" ? properties?.find((p) => p.id === selectedPropertyId) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="ROI Calculator"
        description="Underwrite a deal in real time — levered IRR, cash-on-cash and equity multiple update as you move the assumptions."
        actions={
          <>
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger className="h-9 w-[240px] max-w-full text-[13px]" aria-label="Load from property">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Custom values" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom scenario</SelectItem>
                {isLoading && <SelectItem value="_loading" disabled>Loading…</SelectItem>}
                {properties?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — {p.property_type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={reset}><RotateCcw /> Reset</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* ── Assumptions ───────────────────────────── */}
        <Panel eyebrow="Inputs" title="Assumptions" className="lg:sticky lg:top-4"
          description={loaded ? `Seeded from ${loaded.name}` : "Custom scenario"}>
          <div className="space-y-5">
            <Group title="Acquisition">
              <MoneyInput label="Purchase price" value={purchasePrice} onChange={setPurchasePrice} />
              <MoneyInput label="Year-1 NOI" value={noi} onChange={setNoi} />
            </Group>
            <Group title="Growth & exit">
              <SliderRow label="Hold period" value={holdPeriod} display={`${holdPeriod} yrs`} min={1} max={15} step={1} onChange={setHoldPeriod} />
              <SliderRow label="NOI growth" value={noiGrowth} display={`${noiGrowth.toFixed(1)}%/yr`} min={0} max={8} step={0.5} onChange={setNoiGrowth} />
              <SliderRow label="Exit cap rate" value={exitCapRate} display={`${exitCapRate.toFixed(2)}%`} min={3} max={12} step={0.1} onChange={setExitCapRate}
                hint={`Going-in ${finite(r.capRate, 2, "%")} · ${Number.isFinite(r.capRate) ? `${((exitCapRate - r.capRate) * 100).toFixed(0)} bps expansion` : "—"}`} />
            </Group>
            <Group title="Financing">
              <SliderRow label="Loan-to-value" value={loanToValue} display={`${loanToValue}%`} min={0} max={90} step={5} onChange={setLoanToValue}
                hint={`${fmtDollar(r.loanAmount)} debt · ${fmtDollar(r.equity)} equity`} />
              <SliderRow label="Interest rate (I/O)" value={interestRate} display={`${interestRate.toFixed(2)}%`} min={2} max={12} step={0.25} onChange={setInterestRate}
                hint={`${fmtDollar(r.annualDebtService)}/yr debt service`} />
            </Group>
            <Group title="Hurdle">
              <SliderRow label="Discount rate" value={discountRate} display={`${discountRate.toFixed(1)}%`} min={4} max={20} step={0.5} onChange={setDiscountRate} />
            </Group>
          </div>
        </Panel>

        {/* ── Outputs ───────────────────────────────── */}
        <div className="min-w-0 space-y-3">
          <section className="ss-card-glow relative overflow-hidden">
            <div className="ss-blueprint pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
            <div className="relative grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <div className="flex flex-col justify-between gap-6 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <p className="ss-eyebrow flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-[2px] bg-primary" />Levered IRR</p>
                  <span className={cn(
                    "rounded-md border px-1.5 py-0.5 font-mono text-[10.5px] tabular-nums",
                    clears ? "border-success/25 bg-success/10 text-success" : "border-destructive/25 bg-destructive/10 text-destructive",
                  )}>
                    {Number.isFinite(spread) ? `${spread >= 0 ? "+" : ""}${spread.toFixed(0)} bps vs hurdle` : "—"}
                  </span>
                </div>
                <div>
                  <p className={cn("font-mono text-[64px] font-medium leading-[0.9] tracking-[-0.05em] tabular-nums sm:text-[80px]", clears ? "text-foreground" : "text-destructive")}>
                    {finite(r.irr, 1)}<span className="text-[0.45em] text-muted-foreground">%</span>
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {clears ? "Clears" : "Misses"} the <span className="font-mono tabular-nums text-foreground">{discountRate.toFixed(1)}%</span> hurdle over a{" "}
                    <span className="font-mono tabular-nums text-foreground">{holdPeriod}-year</span> hold.
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-px border-t bg-border md:border-l md:border-t-0">
                {[
                  { k: "Cash-on-cash", v: finite(r.cashOnCash, 2, "%"), sub: "Year 1, levered", tone: r.cashOnCash >= 0 ? "" : "text-destructive" },
                  { k: "Equity multiple", v: finite(r.equityMultiple, 2, "×"), sub: `${fmtDollar(r.totalProfit)} profit`, tone: "" },
                  { k: "Going-in cap", v: finite(r.capRate, 2, "%"), sub: `Exit at ${exitCapRate.toFixed(2)}%`, tone: "" },
                  { k: "NPV", v: Number.isFinite(r.npv) ? fmtDollar(r.npv) : "—", sub: `@ ${discountRate.toFixed(1)}%`, tone: r.npv >= 0 ? "text-success" : "text-destructive" },
                ].map((x) => (
                  <div key={x.k} className="bg-card/80 p-4 backdrop-blur-sm sm:p-5">
                    <dt className="ss-eyebrow text-[9.5px]">{x.k}</dt>
                    <dd className={cn("mt-2 font-mono text-[22px] font-medium leading-none tracking-[-0.03em] tabular-nums sm:text-[26px]", x.tone)}>{x.v}</dd>
                    <p className="mt-1.5 truncate font-mono text-[10.5px] tabular-nums text-muted-foreground">{x.sub}</p>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <Panel eyebrow="Cash flow" title="Levered equity cash flows"
            actions={
              <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-data" /> Operating</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-primary" /> Reversion</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-foreground/60" /> Cumulative</span>
              </div>
            }>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 4, left: -4, bottom: 0 }} stackOffset="sign">
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
                  <YAxis {...axisProps} width={56} tickFormatter={(v) => fmtDollar(Number(v))} />
                  <ReferenceLine y={0} stroke="hsl(var(--border-strong))" />
                  <Tooltip
                    {...tooltipProps}
                    formatter={(v: number, name: string) => [fmtDollar(v), ({ equityOut: "Equity in", operatingIn: "Operating", reversion: "Reversion", cumulative: "Cumulative" } as Record<string, string>)[name] ?? name]}
                  />
                  <Bar dataKey="equityOut" stackId="cf" fill={CHART.destructive} fillOpacity={0.85} radius={[0, 0, 4, 4]} maxBarSize={36} />
                  <Bar dataKey="operatingIn" stackId="cf" fill={CHART.data} maxBarSize={36}>
                    {chartData.map((d) => <Cell key={d.year} fill={d.operatingIn < 0 ? CHART.destructive : CHART.data} />)}
                  </Bar>
                  <Bar dataKey="reversion" stackId="cf" fill={CHART.primary} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--foreground) / 0.6)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="-mx-5 mt-3 overflow-x-auto border-t">
              <table className="w-full min-w-[560px] text-[12.5px]">
                <thead>
                  <tr className="text-left">
                    <th className="ss-eyebrow sticky left-0 bg-card px-5 py-2 text-[9px] font-medium" />
                    {r.years.map((y) => <th key={y.year} className="ss-eyebrow px-3 py-2 text-right text-[9px] font-medium">{y.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70 font-mono tabular-nums">
                  {[
                    { k: "NOI", get: (i: number) => (i ? r.years[i].noi : null) },
                    { k: "Debt service", get: (i: number) => (i ? -r.annualDebtService : null) },
                    { k: "Reversion", get: (i: number) => (r.years[i].reversion ? r.years[i].reversion : null) },
                    { k: "Net cash flow", get: (i: number) => r.cashFlows[i], strong: true },
                  ].map((row) => (
                    <tr key={row.k} className={cn(row.strong && "bg-surface-2/40")}>
                      <td className={cn("sticky left-0 whitespace-nowrap bg-card px-5 py-2 font-sans text-xs text-muted-foreground", row.strong && "bg-surface-2 font-medium text-foreground")}>{row.k}</td>
                      {r.years.map((y, i) => {
                        const v = row.get(i);
                        return (
                          <td key={y.year} className={cn("whitespace-nowrap px-3 py-2 text-right", v !== null && v < 0 && "text-destructive", row.strong && "font-medium")}>
                            {v === null ? <span className="text-muted-foreground/40">·</span> : fmtDollar(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <Panel eyebrow="Sensitivity" title="IRR by exit cap × NOI growth"
              actions={<TrendingUp className="h-4 w-4 text-muted-foreground" />}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-separate border-spacing-1 font-mono text-[12px] tabular-nums">
                  <thead>
                    <tr>
                      <th className="ss-eyebrow pb-1 text-left text-[9px] font-medium">Cap ↓ · g →</th>
                      {sensitivity[0].cells.map((c) => <th key={c.g} className="pb-1 text-center text-[10.5px] font-normal text-muted-foreground">{c.g.toFixed(1)}%</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivity.map((row, ri) => (
                      <tr key={row.cap}>
                        <td className="pr-1 text-[10.5px] text-muted-foreground">{row.cap.toFixed(2)}%</td>
                        {row.cells.map((c, ci) => {
                          const delta = c.irr - discountRate;
                          const base = ri === 2 && ci === 2;
                          return (
                            <td key={c.g} className={cn(
                              "rounded-md px-1.5 py-2 text-center",
                              !Number.isFinite(c.irr) ? "bg-muted text-muted-foreground"
                                : delta >= 2 ? "bg-success/15 text-success"
                                  : delta >= 0 ? "bg-success/[0.07] text-foreground"
                                    : delta >= -2 ? "bg-warning/10 text-warning"
                                      : "bg-destructive/10 text-destructive",
                              base && "ring-1 ring-primary ring-offset-1 ring-offset-card",
                            )}>
                              {finite(c.irr, 1)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Outlined cell is the current scenario. Green clears the {discountRate.toFixed(1)}% hurdle.</p>
            </Panel>

            <Panel eyebrow="Capital stack" title="Sources & exit" actions={<Landmark className="h-4 w-4 text-muted-foreground" />}>
              <div className="space-y-4">
                <div>
                  <div className="flex h-8 w-full overflow-hidden rounded-lg border">
                    <div className="flex items-center justify-start bg-primary/15 px-2 font-mono text-[10.5px] tabular-nums text-primary transition-[width] duration-500 ease-out-expo"
                      style={{ width: `${100 - loanToValue}%` }}>{100 - loanToValue > 12 ? `Equity ${100 - loanToValue}%` : ""}</div>
                    <div className="flex flex-1 items-center justify-end bg-data/15 px-2 font-mono text-[10.5px] tabular-nums text-data">{loanToValue > 12 ? `Debt ${loanToValue}%` : ""}</div>
                  </div>
                </div>
                <dl className="divide-y divide-border/70 text-[13px]">
                  {[
                    ["Equity required", fmtDollar(r.equity)],
                    ["Loan amount", fmtDollar(r.loanAmount)],
                    ["Annual debt service", fmtDollar(r.annualDebtService)],
                    ["Year-1 cash flow", fmtDollar(r.year1CashFlow)],
                    ["Exit value", fmtDollar(r.exitValue)],
                    ["Loan payoff (interest-only)", fmtDollar(r.remainingLoan)],
                    ["Payback", r.paybackYear ? `Year ${r.paybackYear}` : "At exit"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 py-2">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className={cn("font-mono tabular-nums", String(v).startsWith("-") && "text-destructive")}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">DSCR (Year 1)</span>
                    <span className={cn("font-mono tabular-nums", r.dscr === null ? "text-muted-foreground" : r.dscr >= 1.25 ? "text-success" : r.dscr >= 1 ? "text-warning" : "text-destructive")}>
                      {r.dscr === null ? "Unlevered" : `${r.dscr.toFixed(2)}×`}
                    </span>
                  </div>
                  <Meter value={r.dscr === null ? 100 : Math.min(r.dscr, 2)} max={2}
                    tone={r.dscr === null || r.dscr >= 1.25 ? "success" : r.dscr >= 1 ? "warning" : "destructive"} />
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
