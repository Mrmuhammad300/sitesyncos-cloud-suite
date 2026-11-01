import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowDownRight, ArrowUpRight, Check, CheckCheck, Clock, Flag, Inbox, Plus, Scale, Wallet, X, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar, type StatusTone } from "@/components/os";
import { useTreasuryTransactions, useCreateTreasuryTransaction, useUpdateTreasuryTransaction } from "@/hooks/useVaultData";
import type { Database } from "@/integrations/supabase/types";
import { daysUntil } from "@/lib/dashboard";
import { cn, fmtDollar } from "@/lib/utils";
import { CHART, axisProps, gridProps, tooltipProps } from "@/lib/chart";

type Txn = Database["public"]["Tables"]["treasury_transactions"]["Row"];
type View = "ledger" | "milestones" | "approvals";

const VIEWS: Record<View, { title: string; description: string; type: string; cta: string }> = {
  ledger: { title: "Ledger", description: "Every debit and credit across construction, operating and escrow accounts — with a live running balance.", type: "Ledger", cta: "New entry" },
  milestones: { title: "Milestones", description: "Milestone-based payment releases tied to project progress.", type: "Milestone", cta: "New milestone" },
  approvals: { title: "Approvals", description: "Payments waiting on sign-off. Review, approve or reject — singly or in bulk.", type: "Approval", cta: "Request approval" },
};

const isPending = (s: string) => /^pending/i.test(s);
const txnTone = (s: string): StatusTone | undefined =>
  isPending(s) ? "warning" : s === "Posted" || s === "Completed" ? "success" : undefined;
const amount = (t: Txn) => Number(t.debit) || Number(t.credit) || 0;
const fmtDay = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const initials = (n: string | null) => (n ? n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "—");
const EMPTY_FORM = { txn_number: "", description: "", debit: "", credit: "", account: "General", project_name: "", txn_type: "Ledger", status: "Posted", requestor: "" };

export default function TreasuryPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const view: View = pathname.endsWith("/milestones") ? "milestones" : pathname.endsWith("/approvals") ? "approvals" : "ledger";
  const cfg = VIEWS[view];

  const { data: transactions = [], isLoading } = useTreasuryTransactions();
  const create = useCreateTreasuryTransaction();
  const update = useUpdateTreasuryTransaction();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [account, setAccount] = useState("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // Ledger = every journal entry that isn't a milestone schedule or approval request.
  const ledger = transactions.filter((t) => t.txn_type !== "Milestone" && t.txn_type !== "Approval");
  const milestones = transactions.filter((t) => t.txn_type === "Milestone");
  // Approval queue = explicit approval requests plus any transaction still awaiting sign-off.
  const approvals = transactions.filter((t) => t.txn_type === "Approval" || isPending(t.status));
  const queue = approvals.filter((a) => isPending(a.status));
  const decided = approvals.filter((a) => !isPending(a.status));

  const totalDebit = transactions.reduce((s, t) => s + Number(t.debit || 0), 0);
  const totalCredit = transactions.reduce((s, t) => s + Number(t.credit || 0), 0);
  const net = totalCredit - totalDebit;
  const pendingCount = queue.length;
  const pendingValue = queue.reduce((s, t) => s + amount(t), 0);

  // Running balance in chronological order, displayed newest-first.
  const led = useMemo(() => {
    const asc = [...ledger].sort((a, b) => a.txn_date.localeCompare(b.txn_date) || a.txn_number.localeCompare(b.txn_number));
    let bal = 0;
    const withBal = asc.map((t) => {
      bal += Number(t.credit || 0) - Number(t.debit || 0);
      return { ...t, balance: bal };
    });
    const series = withBal.map((t) => ({ date: fmtDay(t.txn_date), balance: t.balance }));
    const accounts = Array.from(new Set(ledger.map((t) => t.account))).sort();
    const byAccount = accounts.map((a) => {
      const rows = ledger.filter((t) => t.account === a);
      const cr = rows.reduce((s, t) => s + Number(t.credit || 0), 0);
      const dr = rows.reduce((s, t) => s + Number(t.debit || 0), 0);
      return { account: a, cr, dr, net: cr - dr, n: rows.length };
    });
    return { rows: withBal.reverse(), series, accounts, byAccount };
  }, [ledger]);

  const q = search.toLowerCase();
  const matches = (t: Txn) =>
    !q || t.description.toLowerCase().includes(q) || t.txn_number.toLowerCase().includes(q) || (t.project_name ?? "").toLowerCase().includes(q);
  const ledgerRows = led.rows.filter((t) => (account === "all" || t.account === account) && matches(t));
  const pageDebit = ledgerRows.reduce((s, t) => s + Number(t.debit || 0), 0);
  const pageCredit = ledgerRows.reduce((s, t) => s + Number(t.credit || 0), 0);

  const openNew = () => {
    setForm({ ...EMPTY_FORM, txn_type: cfg.type, status: view === "ledger" ? "Posted" : "Pending" });
    setOpen(true);
  };
  const handleSubmit = () => {
    create.mutate({
      txn_number: form.txn_number, description: form.description, debit: Number(form.debit) || 0,
      credit: Number(form.credit) || 0, account: form.account, project_name: form.project_name,
      txn_type: form.txn_type, status: form.status, requestor: form.requestor,
    });
    setOpen(false);
    setForm(EMPTY_FORM);
  };
  const decide = (ids: string[], status: "Approved" | "Rejected") => {
    ids.forEach((id) => update.mutate({ id, status }));
    setPicked(new Set());
  };
  const togglePick = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const setField = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const milestoneReleased = milestones.filter((m) => !isPending(m.status) && m.status !== "Rejected").reduce((s, m) => s + amount(m), 0);
  const milestoneTotal = milestones.reduce((s, m) => s + amount(m), 0);
  const approvedValue = decided.filter((a) => a.status === "Approved").reduce((s, a) => s + amount(a), 0);
  const oldest = queue.reduce<number | null>((o, a) => { const age = -(daysUntil(a.txn_date) ?? 0); return o === null || age > o ? age : o; }, null);

  return (
    <div className="space-y-6">
      <PageHeader
        title={cfg.title}
        eyebrow="Quantum Ledger"
        description={cfg.description}
        actions={<Button onClick={openNew}><Plus /> {cfg.cta}</Button>}
      >
        <Tabs value={view} onValueChange={(v) => navigate(`/treasury/${v}`)}>
          <TabsList className="h-9">
            <TabsTrigger value="ledger" className="gap-1.5 text-xs"><Wallet className="h-3.5 w-3.5" />Ledger<span className="font-mono text-[10px] tabular-nums text-muted-foreground">{ledger.length}</span></TabsTrigger>
            <TabsTrigger value="milestones" className="gap-1.5 text-xs"><Flag className="h-3.5 w-3.5" />Milestones<span className="font-mono text-[10px] tabular-nums text-muted-foreground">{milestones.length}</span></TabsTrigger>
            <TabsTrigger value="approvals" className="gap-1.5 text-xs">
              <Inbox className="h-3.5 w-3.5" />Approvals
              {pendingCount > 0 ? <span className="rounded bg-warning/15 px-1 font-mono text-[10px] tabular-nums text-warning">{pendingCount}</span>
                : <span className="font-mono text-[10px] tabular-nums text-muted-foreground">0</span>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>

      {/* ── KPIs per view ─────────────────────────────── */}
      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {view === "ledger" && (
          <>
            <StatCard label="Net position" value={fmtDollar(net)} icon={Scale} loading={isLoading} tone={net > 0 ? "success" : net < 0 ? "destructive" : "default"}
              spark={led.series.length > 1 ? led.series.map((s) => s.balance) : undefined} hint="Credits − debits" />
            <StatCard label="Total credits" value={fmtDollar(totalCredit)} icon={ArrowDownRight} loading={isLoading}
              hint={`${transactions.filter((t) => Number(t.credit) > 0).length} inflows`} />
            <StatCard label="Total debits" value={fmtDollar(totalDebit)} icon={ArrowUpRight} loading={isLoading}
              hint={`${transactions.filter((t) => Number(t.debit) > 0).length} outflows`} />
            <StatCard label="Pending approval" value={pendingCount} icon={Clock} loading={isLoading} tone={pendingCount ? "warning" : "default"}
              hint={pendingCount ? `${fmtDollar(pendingValue)} on hold` : "Queue clear"} onClick={() => navigate("/treasury/approvals")} />
          </>
        )}
        {view === "milestones" && (
          <>
            <StatCard label="Scheduled value" value={fmtDollar(milestoneTotal)} icon={Flag} tone="data" loading={isLoading} hint={`${milestones.length} milestones`} />
            <StatCard label="Released" value={fmtDollar(milestoneReleased)} icon={CheckCheck} tone={milestoneReleased ? "success" : "default"} loading={isLoading}
              hint={milestoneTotal ? `${Math.round((milestoneReleased / milestoneTotal) * 100)}% of schedule` : "—"} />
            <StatCard label="Awaiting release" value={fmtDollar(milestoneTotal - milestoneReleased)} icon={Clock} loading={isLoading}
              hint={`${milestones.filter((m) => isPending(m.status)).length} pending`} />
            <StatCard label="Net position" value={fmtDollar(net)} icon={Scale} loading={isLoading} tone={net > 0 ? "success" : net < 0 ? "destructive" : "default"} hint="All accounts" />
          </>
        )}
        {view === "approvals" && (
          <>
            <StatCard label="In queue" value={pendingCount} icon={Inbox} tone={pendingCount ? "warning" : "default"} loading={isLoading}
              hint={oldest !== null ? `Oldest ${oldest}d waiting` : "Queue clear"} />
            <StatCard label="Value on hold" value={fmtDollar(pendingValue)} icon={Clock} loading={isLoading} hint="Awaiting sign-off" />
            <StatCard label="Approved" value={fmtDollar(approvedValue)} icon={Check} tone={approvedValue ? "success" : "default"} loading={isLoading}
              hint={`${decided.filter((a) => a.status === "Approved").length} decisions`} />
            <StatCard label="Rejected" value={decided.filter((a) => a.status === "Rejected").length} icon={XCircle} loading={isLoading}
              tone={decided.some((a) => a.status === "Rejected") ? "destructive" : "default"} hint="Returned to requestor" />
          </>
        )}
      </section>

      {/* ── Ledger ─────────────────────────────────────── */}
      {view === "ledger" && (
        <>
          {(isLoading || ledger.length > 0) && (
            <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              <Panel className="xl:col-span-2" eyebrow="Running balance" title="Cumulative cash position">
                <div className="h-[220px] w-full">
                  {!isLoading && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={led.series} margin={{ top: 10, right: 16, left: -4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="balFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={CHART.data} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={CHART.data} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid {...gridProps} />
                        <XAxis dataKey="date" {...axisProps} interval="preserveStartEnd" />
                        <YAxis {...axisProps} width={56} tickFormatter={(v) => fmtDollar(Number(v))} />
                        <Tooltip {...tooltipProps} formatter={(v: number) => [fmtDollar(v), "Balance"]} />
                        <Area type="stepAfter" dataKey="balance" stroke={CHART.data} strokeWidth={1.75} fill="url(#balFill)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Panel>
              <Panel eyebrow="Accounts" title="Net by account">
                {isLoading ? (
                  <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />)}</div>
                ) : (
                  <ul className="-mx-2 space-y-0.5">
                    {led.byAccount.map((a) => {
                      const flow = a.cr + a.dr || 1;
                      return (
                        <li key={a.account}>
                          <button type="button" onClick={() => setAccount(account === a.account ? "all" : a.account)}
                            className={cn("w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2/60", account === a.account && "bg-surface-2")}>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-[13px] font-medium">{a.account}<span className="ml-1.5 font-mono text-[10.5px] text-muted-foreground">{a.n}</span></span>
                              <span className={cn("font-mono text-[13px] tabular-nums", a.net >= 0 ? "text-success" : "text-destructive")}>{a.net >= 0 ? "+" : ""}{fmtDollar(a.net)}</span>
                            </div>
                            <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-secondary">
                              <div className="h-full bg-success/80" style={{ width: `${(a.cr / flow) * 100}%` }} />
                              <div className="h-full bg-destructive/80" style={{ width: `${(a.dr / flow) * 100}%` }} />
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </section>
          )}

          <Panel flush eyebrow="Journal" title="Ledger entries">
            <Toolbar className="border-t px-5 py-3">
              <SearchField value={search} onChange={setSearch} placeholder="Search ID, description, project…" />
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger className="h-9 w-[150px] text-[13px]"><SelectValue placeholder="Account" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {led.accounts.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </Toolbar>
            {isLoading ? (
              <div className="space-y-2 border-t p-5">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />)}</div>
            ) : ledger.length === 0 ? (
              <div className="border-t p-5">
                <EmptyState icon={Wallet} title="No ledger entries yet" description="Post a draw, payment or transfer to start the journal and running balance."
                  action={<Button size="sm" onClick={openNew}><Plus /> New entry</Button>} />
              </div>
            ) : ledgerRows.length === 0 ? (
              <div className="border-t p-5">
                <EmptyState compact icon={Wallet} title="No matching entries" description="Try another search or account."
                  action={<Button size="sm" variant="outline" onClick={() => { setSearch(""); setAccount("all"); }}>Clear filters</Button>} />
              </div>
            ) : (
              <div className="overflow-x-auto border-t">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      {["Date", "ID", "Description", "Account", "Debit", "Credit", "Balance"].map((h, i) => (
                        <th key={h} className={cn("ss-eyebrow px-4 py-2.5 text-[9.5px] font-medium first:pl-5 last:pr-5", i >= 4 && "text-right")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {ledgerRows.map((e) => {
                      const dr = Number(e.debit || 0);
                      const cr = Number(e.credit || 0);
                      return (
                        <tr key={e.id} className="transition-colors hover:bg-surface-2/50">
                          <td className="whitespace-nowrap px-4 py-3 pl-5 font-mono text-xs tabular-nums text-muted-foreground">{fmtDay(e.txn_date)}</td>
                          <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{e.txn_number}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
                                cr > 0 ? "border-success/25 bg-success/10 text-success" : "border-destructive/25 bg-destructive/10 text-destructive")}>
                                {cr > 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium">{e.description}</p>
                                <p className="truncate text-[11px] text-muted-foreground">{e.project_name || "—"} · {e.txn_type}{isPending(e.status) ? " · pending" : ""}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><span className="rounded-md border bg-surface-2/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">{e.account}</span></td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-destructive">{dr > 0 ? `−${fmtDollar(dr)}` : <span className="text-muted-foreground/40">·</span>}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-success">{cr > 0 ? `+${fmtDollar(cr)}` : <span className="text-muted-foreground/40">·</span>}</td>
                          <td className={cn("whitespace-nowrap px-4 py-3 pr-5 text-right font-mono tabular-nums", e.balance < 0 && "text-destructive")}>{fmtDollar(e.balance)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-surface-2/40">
                      <td colSpan={4} className="px-4 py-3 pl-5 text-xs text-muted-foreground">
                        {ledgerRows.length} entr{ledgerRows.length === 1 ? "y" : "ies"}{account !== "all" || q ? " (filtered)" : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-destructive">−{fmtDollar(pageDebit)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-success">+{fmtDollar(pageCredit)}</td>
                      <td className={cn("px-4 py-3 pr-5 text-right font-mono text-[13px] font-medium tabular-nums", pageCredit - pageDebit < 0 && "text-destructive")}>
                        {fmtDollar(pageCredit - pageDebit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      {/* ── Milestones ─────────────────────────────────── */}
      {view === "milestones" && (
        <Panel eyebrow="Schedule" title="Milestone releases">
          {isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
          ) : milestones.length === 0 ? (
            <EmptyState icon={Flag} title="No milestones scheduled"
              description="Tie payment releases to project progress — substantial completion, top-out, TCO."
              action={<Button size="sm" onClick={openNew}><Plus /> New milestone</Button>} />
          ) : (
            <ol className="relative space-y-2 before:absolute before:bottom-4 before:left-[11px] before:top-4 before:w-px before:bg-border">
              {[...milestones].sort((a, b) => a.txn_date.localeCompare(b.txn_date)).map((m) => {
                const done = !isPending(m.status) && m.status !== "Rejected";
                return (
                  <li key={m.id} className="relative flex items-center gap-4 pl-9">
                    <span className={cn("absolute left-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card",
                      done ? "bg-success text-success-foreground" : "bg-surface-3 text-muted-foreground")}>
                      {done ? <Check className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-surface-2/40 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">{m.description}</p>
                        <p className="truncate font-mono text-[10.5px] text-muted-foreground">{m.txn_number} · {m.project_name || "—"} · {fmtDay(m.txn_date)}</p>
                      </div>
                      <span className="font-mono text-sm tabular-nums">{fmtDollar(amount(m))}</span>
                      <StatusPill status={m.status} tone={txnTone(m.status)} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      )}

      {/* ── Approvals ──────────────────────────────────── */}
      {view === "approvals" && (
        <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-3">
          <Panel className="xl:col-span-2" flush eyebrow="Queue" title={`${queue.length} awaiting decision`}
            actions={queue.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={picked.size > 0 && picked.size === queue.length}
                  onCheckedChange={(c) => setPicked(c ? new Set(queue.map((a) => a.id)) : new Set())} aria-label="Select all" />
                Select all
              </label>
            )}>
            {picked.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-surface-2/60 px-5 py-2.5">
                <span className="text-xs"><span className="font-mono tabular-nums">{picked.size}</span> selected ·{" "}
                  <span className="font-mono tabular-nums">{fmtDollar(queue.filter((a) => picked.has(a.id)).reduce((s, a) => s + amount(a), 0))}</span></span>
                <div className="flex gap-1.5">
                  <Button size="xs" variant="outline" onClick={() => decide([...picked], "Rejected")}><X /> Reject</Button>
                  <Button size="xs" onClick={() => decide([...picked], "Approved")}><Check /> Approve {picked.size}</Button>
                </div>
              </div>
            )}
            {isLoading ? (
              <div className="space-y-2 border-t p-5">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
            ) : queue.length === 0 ? (
              <div className="border-t p-5">
                <EmptyState icon={CheckCheck} title="Queue clear" description="Nothing is waiting on your sign-off."
                  action={<Button size="sm" variant="outline" onClick={openNew}><Plus /> Request approval</Button>} />
              </div>
            ) : (
              <ul className="divide-y divide-border/70 border-t">
                {queue.map((a) => {
                  const age = -(daysUntil(a.txn_date) ?? 0);
                  const outflow = Number(a.debit) > 0;
                  return (
                    <li key={a.id} className={cn("flex flex-col gap-3 px-5 py-4 transition-colors sm:flex-row sm:items-center", picked.has(a.id) && "bg-primary/[0.04]")}>
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <Checkbox className="mt-1" checked={picked.has(a.id)} onCheckedChange={() => togglePick(a.id)} aria-label={`Select ${a.txn_number}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] text-muted-foreground">{a.txn_number}</span>
                            <span className={cn("font-mono text-[10.5px] tabular-nums", age >= 7 ? "text-warning" : "text-muted-foreground")}>· {age <= 0 ? "today" : `${age}d waiting`}</span>
                          </div>
                          <p className="mt-0.5 truncate text-[14px] font-medium">{a.description}</p>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full border bg-surface-2 font-mono text-[9px]">{initials(a.requestor)}</span>
                            <span className="truncate">{a.requestor || "Unknown"} · {a.project_name || "—"} · {a.account}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4 pl-7 sm:justify-end sm:pl-0">
                        <div className="text-right">
                          <p className={cn("font-mono text-[18px] font-medium leading-none tabular-nums", outflow ? "text-foreground" : "text-success")}>{fmtDollar(amount(a))}</p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{outflow ? "Outflow" : "Inflow"}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="icon" variant="outline" className="h-8 w-8 hover:border-destructive/40 hover:text-destructive" aria-label={`Reject ${a.txn_number}`}
                            onClick={() => update.mutate({ id: a.id, status: "Rejected" })}><X /></Button>
                          <Button size="sm" onClick={() => update.mutate({ id: a.id, status: "Approved" })}><Check /> Approve</Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel eyebrow="History" title="Recent decisions">
            {isLoading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}</div>
            ) : decided.length === 0 ? (
              <EmptyState compact icon={Inbox} title="No decisions yet" description="Approved and rejected requests appear here." />
            ) : (
              <ul className="-mx-2 space-y-0.5">
                {decided.slice(0, 8).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px]">{a.description}</p>
                      <p className="font-mono text-[10.5px] text-muted-foreground">{a.txn_number} · {fmtDay(a.txn_date)}</p>
                    </div>
                    <span className="font-mono text-[12px] tabular-nums">{fmtDollar(amount(a))}</span>
                    <StatusPill status={a.status} tone={txnTone(a.status)} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{cfg.cta}</DialogTitle>
            <DialogDescription>Entries post to the Quantum Ledger and roll into the running balance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label className="text-xs">Transaction #</Label><Input className="font-mono" value={form.txn_number} onChange={setField("txn_number")} placeholder="TXN-5010" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Type</Label>
                <Select value={form.txn_type} onValueChange={(v) => setForm((f) => ({ ...f, txn_type: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Ledger", "Milestone", "Approval"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Description</Label><Input value={form.description} onChange={setField("description")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Debit (outflow)</Label><Input type="number" className="font-mono" value={form.debit} onChange={setField("debit")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Credit (inflow)</Label><Input type="number" className="font-mono" value={form.credit} onChange={setField("credit")} /></div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label className="text-xs">Account</Label><Input value={form.account} onChange={setField("account")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Project</Label><Input value={form.project_name} onChange={setField("project_name")} /></div>
            </div>
            {form.txn_type === "Approval" && (
              <div className="space-y-1.5"><Label className="text-xs">Requestor</Label><Input value={form.requestor} onChange={setField("requestor")} /></div>
            )}
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!form.txn_number || !form.description}>Create</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
