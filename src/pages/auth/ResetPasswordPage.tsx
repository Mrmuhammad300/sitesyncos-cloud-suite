import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/os/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/** 0–4 heuristic strength score. */
function score(pw: string) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH = [
  { label: "Too short", bar: "bg-destructive", text: "text-destructive" },
  { label: "Weak", bar: "bg-destructive", text: "text-destructive" },
  { label: "Fair", bar: "bg-warning", text: "text-warning" },
  { label: "Good", bar: "bg-success", text: "text-success" },
  { label: "Strong", bar: "bg-success", text: "text-success" },
];

/** Isometric key-plate that draws itself in — the recovery brand moment. */
function RecoveryMark() {
  const cx = 260;
  return (
    <svg viewBox="0 0 520 520" className="h-full w-full" aria-hidden>
      <g stroke="hsl(var(--foreground) / 0.08)" strokeWidth="1">
        {Array.from({ length: 9 }).map((_, i) => {
          const t = (i - 4) * 30;
          return (
            <g key={i}>
              <line x1={cx - 240 + t * 2} y1={420 + 30 - t} x2={cx + t * 2} y2={420 + 150 - t} />
              <line x1={cx + 240 + t * 2} y1={420 + 30 + t} x2={cx + t * 2} y2={420 - 90 + t} />
            </g>
          );
        })}
      </g>
      {/* vault slab */}
      <g fill="none" strokeWidth="1.25">
        <path d={`M${cx},170 L${cx + 150},245 L${cx},320 L${cx - 150},245 Z`} stroke="hsl(var(--foreground) / 0.35)" fill="hsl(var(--foreground) / 0.015)" className="animate-draw" style={{ ["--len" as string]: 700, animationDelay: "0.2s" }} />
        <path d={`M${cx - 150},245 L${cx - 150},285 L${cx},360 L${cx + 150},285 L${cx + 150},245`} stroke="hsl(var(--foreground) / 0.25)" className="animate-draw" style={{ ["--len" as string]: 600, animationDelay: "0.4s" }} />
        <path d={`M${cx},320 L${cx},360`} stroke="hsl(var(--foreground) / 0.25)" />
      </g>
      {/* dial */}
      <g fill="none">
        <ellipse cx={cx} cy={245} rx="70" ry="35" stroke="hsl(var(--primary))" strokeWidth="1.5" fill="hsl(var(--primary) / 0.08)" className="animate-draw" style={{ ["--len" as string]: 360, animationDelay: "0.8s" }} />
        <ellipse cx={cx} cy={245} rx="40" ry="20" stroke="hsl(var(--primary) / 0.6)" strokeWidth="1.2" strokeDasharray="3 4" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1={cx + Math.cos(a) * 58} y1={245 + Math.sin(a) * 29} x2={cx + Math.cos(a) * 66} y2={245 + Math.sin(a) * 33} stroke="hsl(var(--primary) / 0.7)" strokeWidth="1.2" />;
        })}
        <line x1={cx} y1={245} x2={cx + 32} y2={232} stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" />
      </g>
      {/* key beam */}
      <g stroke="hsl(var(--data) / 0.8)" strokeWidth="1.25" fill="none" className="animate-draw" style={{ ["--len" as string]: 500, animationDelay: "1.3s" }}>
        <path d={`M${cx},245 L${cx},110 M${cx - 18},128 L${cx},110 L${cx + 18},128`} />
        <path d={`M${cx + 70},110 L${cx + 160},110`} strokeDasharray="2 3" />
      </g>
      {[[cx - 150, 245, "A1"], [cx + 150, 245, "B1"], [cx, 110, "RST"]].map(([x, y, l], i) => (
        <g key={i} className="animate-fade-in" style={{ animationDelay: `${1.6 + i * 0.15}s` }}>
          <circle cx={x as number} cy={y as number} r="3" fill="hsl(var(--primary))" />
          <circle cx={x as number} cy={y as number} r="9" fill="none" stroke="hsl(var(--primary) / 0.4)" />
          <text x={(x as number) + 14} y={(y as number) + 4} fontSize="10" fontFamily="Geist Mono, monospace" fill="hsl(var(--muted-foreground))">{l as string}</text>
        </g>
      ))}
    </svg>
  );
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // The auth screens are always dark — it's the brand moment.
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!had) root.classList.remove("dark");
    };
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      toast.error("Invalid reset link");
      navigate("/login");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords don't match"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated!");
    navigate("/");
  };

  const s = password ? score(password) : 0;
  const strength = STRENGTH[password.length < 6 ? 0 : s];
  const matches = confirm.length > 0 && confirm === password;
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <div className="relative grid min-h-svh bg-background text-foreground lg:grid-cols-[1.15fr_1fr]">
      {/* ── Left: brand canvas ─────────────────────────── */}
      <aside className="relative hidden overflow-hidden border-r lg:flex lg:flex-col">
        <div className="ss-blueprint absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,hsl(var(--primary)/0.14),transparent_55%),radial-gradient(ellipse_at_80%_90%,hsl(var(--data)/0.10),transparent_50%)]" />
        <div className="ss-noise absolute inset-0" />

        <div className="relative z-10 flex items-center gap-2.5 p-10">
          <BrandMark className="h-9 w-9" />
          <span className="text-[17px] font-semibold tracking-tight">SiteSync</span>
          <span className="rounded border px-1 py-px font-mono text-[9px] tracking-widest text-muted-foreground">OS</span>
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center px-10">
          <div className="aspect-square w-full max-w-[480px]">
            <RecoveryMark />
          </div>
        </div>

        <div className="relative z-10 space-y-6 p-10 pt-0">
          <h2 className="ss-display max-w-lg text-[44px] leading-[1]">
            Back on site in <span className="italic text-primary">one step</span>.
          </h2>
          <p className="max-w-md border-t pt-6 text-xs leading-relaxed text-muted-foreground">
            Recovery links are single-use and expire after an hour. Your projects, approvals and audit trail are untouched.
          </p>
        </div>
      </aside>

      {/* ── Right: form ────────────────────────────────── */}
      <main className="relative flex flex-col items-center justify-center px-6 py-12 sm:px-10">
        <div className="ss-blueprint ss-blueprint-fade absolute inset-0 lg:hidden" />
        <div className="relative w-full max-w-[380px] animate-slide-up">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <BrandMark className="h-9 w-9" />
            <span className="text-[17px] font-semibold tracking-tight">SiteSync</span>
          </div>

          <p className="ss-eyebrow mb-3">Account recovery</p>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">Set a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choose something unique — at least 6 characters.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs text-muted-foreground">New password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-9 pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2 pt-1" aria-live="polite">
                <div className="grid flex-1 grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className={cn("h-1 rounded-full transition-colors duration-300", password && i <= Math.max(s, 1) ? strength.bar : "bg-secondary")} />
                  ))}
                </div>
                <span className={cn("w-16 text-right font-mono text-[10.5px] uppercase tracking-wider", password ? strength.text : "text-muted-foreground/60")}>
                  {password ? strength.label : "—"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs text-muted-foreground">Confirm password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={cn("h-11 pl-9 pr-10", mismatch && "border-destructive/60 focus:border-destructive")}
                  aria-invalid={mismatch}
                  required
                />
                {matches && <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" aria-label="Passwords match" />}
              </div>
              {mismatch && <p className="text-xs text-destructive">Passwords don't match yet.</p>}
            </div>

            <Button type="submit" size="lg" className="group w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              {loading ? "Updating…" : "Update password"}
              {!loading && <ArrowRight className="transition-transform group-hover:translate-x-0.5" />}
            </Button>
          </form>

          <Link to="/login" className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
        </div>

        <footer className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
          <span>Build</span><span>·</span><span>Operate</span><span>·</span><span>Own</span>
        </footer>
      </main>
    </div>
  );
}
