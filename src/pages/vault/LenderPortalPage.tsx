import { useMemo, useState } from "react";
import { CalendarClock, Gauge, Landmark, PiggyBank, Plus, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, Meter, PageHeader, Panel, StatCard, StatusPill, type StatusTone } from "@/components/os";
import { ScoreRing } from "@/components/vault/ScoreRing";
import { scoreTone } from "@/components/vault/score";
import { useLenders, useCreateLender, useUpdateLender } from "@/hooks/useVaultData";
import { daysUntil } from "@/lib/dashboard";
import { cn, fmtDollar } from "@/lib/utils";

const STATUSES = ["Active", "Maturing", "Closed"];
const LENDER_TONE: Record<string, StatusTone> = {
  Active: "success", Committed: "info", Maturing: "warning", Watch: "warning", Closed: "neutral", Default: "destructive",
};
const EMPTY_FORM = { name: "", loan_type: "Senior Debt", commitment: "", drawn: "", rate: "", maturity: "", status: "Active", compliance_score: "100" };

function countdown(days: number | null) {
  if (days === null) return { big: "—", unit: "", label: "No maturity set" };
  if (days < 0) return { big: String(-days), unit: "d", label: "past maturity" };
  if (days < 120) return { big: String(days), unit: "d", label: "to maturity" };
  const months = days / 30.44;
  if (months < 24) return { big: months.toFixed(0), unit: "mo", label: "to maturity" };
  return { big: (days / 365.25).toFixed(1), unit: "yr", label: "to maturity" };
}

const fmtDate = (d: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export default function LenderPortalPage() {
  const { data: lenders = [], isLoading } = useLenders();
  const create = useCreateLender();
  const update = useUpdateLender();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const totalCommitment = lenders.reduce((s, l) => s + Number(l.commitment), 0);
  const totalDrawn = lenders.reduce((s, l) => s + Number(l.drawn), 0);
  const avgCompliance = lenders.length ? Math.round(lenders.reduce((s, l) => s + (l.compliance_score || 0), 0) / lenders.length) : 0;
  const utilisation = totalCommitment ? Math.round((totalDrawn / totalCommitment) * 100) : 0;

  const ladder = useMemo(() => {
    const rows = lenders
      .map((l) => ({ ...l, days: daysUntil(l.maturity) }))
      .sort((a, b) => (a.days ?? 1e9) - (b.days ?? 1e9));
    const maxDays = Math.max(365, ...rows.map((r) => r.days ?? 0));
    const next = rows.find((r) => r.days !== null && r.days >= 0) ?? null;
    return { rows, maxDays, next };
  }, [lenders]);
  const belowCovenant = lenders.filter((l) => (l.compliance_score ?? 100) < 80).length;

  const handleSubmit = () => {
    create.mutate({
      name: form.name, loan_type: form.loan_type, commitment: Number(form.commitment) || 0,
      drawn: Number(form.drawn) || 0, rate: form.rate, maturity: form.maturity || null,
      status: form.status, compliance_score: Number(form.compliance_score) || 100,
    });
    setOpen(false);
    setForm(EMPTY_FORM);
  };
  const setField = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lender Portal"
        description="Every facility in one place — draw utilisation, maturities and covenant health."
        actions={<Button onClick={() => setOpen(true)}><Plus /> Add facility</Button>}
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total commitment" value={fmtDollar(totalCommitment)} icon={Landmark} tone={lenders.length ? "data" : "default"} loading={isLoading}
          hint={`${lenders.length} facilit${lenders.length === 1 ? "y" : "ies"}`} />
        <StatCard label="Drawn" value={fmtDollar(totalDrawn)} icon={Wallet} loading={isLoading}
          hint={`${utilisation}% utilised`} tone={utilisation >= 85 ? "warning" : "default"} />
        <StatCard label="Available" value={fmtDollar(totalCommitment - totalDrawn)} icon={PiggyBank} tone={totalCommitment - totalDrawn > 0 ? "success" : "default"} loading={isLoading}
          hint={ladder.next ? `Next maturity in ${countdown(ladder.next.days).big}${countdown(ladder.next.days).unit}` : "Undrawn capacity"} />
        <StatCard label="Avg compliance" value={lenders.length ? `${avgCompliance}%` : "—"} icon={ShieldCheck} loading={isLoading}
          tone={!lenders.length ? "default" : scoreTone(avgCompliance) === "success" ? "success" : scoreTone(avgCompliance) === "warning" ? "warning" : "destructive"}
          hint={belowCovenant ? `${belowCovenant} below 80 threshold` : "All above threshold"} />
      </section>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-[248px] animate-pulse rounded-xl bg-muted" />)}</div>
      ) : lenders.length === 0 ? (
        <EmptyState icon={Landmark} title="No facilities yet"
          description="Add a construction loan, mezz piece or permanent facility to start tracking draws and covenants."
          action={<Button size="sm" onClick={() => setOpen(true)}><Plus /> Add facility</Button>} />
      ) : (
        <>
          <section className="stagger grid grid-cols-1 gap-3 md:grid-cols-2">
            {lenders.map((l) => {
              const commitment = Number(l.commitment);
              const drawn = Number(l.drawn);
              const drawPct = commitment ? Math.round((drawn / commitment) * 100) : 0;
              const days = daysUntil(l.maturity);
              const cd = countdown(days);
              const soon = days !== null && days < 180;
              return (
                <article key={l.id} className="ss-card relative overflow-hidden p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="ss-eyebrow text-[9.5px]">{l.loan_type}</p>
                      <h3 className="mt-1 truncate text-[15px] font-semibold tracking-tight">{l.name}</h3>
                      <div className="mt-2">
                        <Select value={l.status} onValueChange={(v) => update.mutate({ id: l.id, status: v })}>
                          <SelectTrigger aria-label={`Status for ${l.name}`} className="h-auto w-auto shrink-0 gap-1 border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-40">
                            <div className="flex"><StatusPill status={l.status} tone={LENDER_TONE[l.status]} /></div>
                          </SelectTrigger>
                          <SelectContent>{Array.from(new Set([l.status, ...STATUSES])).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <ScoreRing value={l.compliance_score} label="Cov" />
                  </div>

                  <div className="mt-5 space-y-2">
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="ss-eyebrow text-[9px]">Drawn</p>
                        <p className="mt-1 font-mono text-[22px] font-medium leading-none tracking-[-0.03em] tabular-nums">{fmtDollar(drawn)}</p>
                      </div>
                      <p className="pb-0.5 font-mono text-xs tabular-nums text-muted-foreground">of {fmtDollar(commitment)}</p>
                    </div>
                    <Meter value={drawPct} risk />
                    <div className="flex justify-between font-mono text-[10.5px] tabular-nums text-muted-foreground">
                      <span>{drawPct}% utilised</span>
                      <span>{fmtDollar(commitment - drawn)} available</span>
                    </div>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border">
                    <div className="bg-card px-3 py-2.5">
                      <dt className="ss-eyebrow text-[9px]">Rate</dt>
                      <dd className="mt-1 truncate font-mono text-[13px] tabular-nums">{l.rate || "—"}</dd>
                    </div>
                    <div className="bg-card px-3 py-2.5">
                      <dt className="ss-eyebrow flex items-center gap-1 text-[9px]"><CalendarClock className="h-2.5 w-2.5" />Maturity</dt>
                      <dd className="mt-1 flex items-baseline gap-1.5">
                        <span className={cn("font-mono text-[13px] tabular-nums", days !== null && days < 0 ? "text-destructive" : soon ? "text-warning" : "")}>
                          {cd.big}<span className="text-muted-foreground">{cd.unit}</span>
                        </span>
                        <span className="truncate text-[11px] text-muted-foreground">{fmtDate(l.maturity)}</span>
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </section>

          <Panel eyebrow="Maturity ladder" title="Facilities by maturity" actions={<Gauge className="h-4 w-4 text-muted-foreground" />}>
            <div className="relative">
              <div className="mb-2 hidden justify-between pl-[180px] font-mono text-[10px] tabular-nums text-muted-foreground sm:flex">
                <span>Today</span>
                <span>{(ladder.maxDays / 365.25 / 2).toFixed(1)} yr</span>
                <span>{(ladder.maxDays / 365.25).toFixed(1)} yr</span>
              </div>
              <ul className="space-y-3">
                {ladder.rows.map((l) => {
                  const pos = l.days === null ? null : Math.max(0, Math.min(100, (l.days / ladder.maxDays) * 100));
                  const share = totalCommitment ? Number(l.commitment) / totalCommitment : 0;
                  return (
                    <li key={l.id} className="grid grid-cols-1 gap-1.5 sm:grid-cols-[168px_minmax(0,1fr)] sm:items-center sm:gap-3">
                      <div className="flex min-w-0 items-baseline justify-between gap-2 sm:block">
                        <p className="truncate text-[13px] font-medium">{l.name}</p>
                        <p className="shrink-0 font-mono text-[10.5px] tabular-nums text-muted-foreground">{fmtDollar(Number(l.commitment))} · {fmtDate(l.maturity)}</p>
                      </div>
                      <div className="relative h-6 rounded-md border bg-surface-2/40">
                        <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                        {pos !== null && (
                          <>
                            <div className="absolute inset-y-[9px] left-0 rounded-full bg-data/25" style={{ width: `${pos}%` }} />
                            <span
                              className={cn(
                                "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card",
                                (l.days ?? 0) < 180 ? "bg-warning" : "bg-data",
                              )}
                              style={{ left: `${Math.max(2, Math.min(98, pos))}%`, width: 10 + share * 14, height: 10 + share * 14 }}
                              title={`${l.days} days`}
                            />
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 text-[11px] text-muted-foreground">Marker size scales with commitment. Amber = matures within 6 months.</p>
            </div>
          </Panel>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add facility</DialogTitle>
            <DialogDescription>Track commitment, draws and covenant compliance for a lender.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Lender name</Label><Input value={form.name} onChange={setField("name")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Loan type</Label>
              <Select value={form.loan_type} onValueChange={(v) => setForm((f) => ({ ...f, loan_type: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{["Senior Debt", "Mezzanine", "Construction", "Bridge"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label className="text-xs">Commitment</Label><Input type="number" className="font-mono" value={form.commitment} onChange={setField("commitment")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Drawn</Label><Input type="number" className="font-mono" value={form.drawn} onChange={setField("drawn")} /></div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label className="text-xs">Rate</Label><Input className="font-mono" value={form.rate} onChange={setField("rate")} placeholder="e.g. SOFR + 225" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Maturity</Label><Input type="date" value={form.maturity} onChange={setField("maturity")} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Compliance score</Label><Input type="number" min="0" max="100" className="font-mono" value={form.compliance_score} onChange={setField("compliance_score")} /></div>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!form.name}>Add facility</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
