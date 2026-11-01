import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/os/BrandMark";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { IS_DEMO } from "@/lib/demo";

const friendly = (msg: string) => {
  const m = msg.toLowerCase();
  if (m.includes("weak") || m.includes("pwned")) return "That password has appeared in a data breach — choose a stronger, unique one.";
  if (m.includes("email not confirmed")) return "Check your inbox to confirm your email.";
  if (m.includes("invalid login") || m.includes("invalid_credentials")) return "Wrong email or password.";
  if (m.includes("already registered") || m.includes("user already")) return "That email is already registered — sign in instead.";
  if (m.includes("rate limit") || m.includes("over_email_send")) return "Too many attempts — try again shortly.";
  if (m.includes("password") && m.includes("6")) return "Password must be at least 6 characters.";
  return msg;
};

/** Isometric tower that draws itself in — the hero of the auth screen. */
function BlueprintTower() {
  const floors = 7;
  const W = 120; // half-width of the floor plate diamond
  const H = 60; // half-height
  const gap = 34;
  const cx = 260;
  const base = 420;
  const plate = (y: number) => `M${cx},${y - H} L${cx + W},${y} L${cx},${y + H} L${cx - W},${y} Z`;

  return (
    <svg viewBox="0 0 520 520" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="towerGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* ground grid */}
      <g stroke="hsl(var(--foreground) / 0.08)" strokeWidth="1">
        {Array.from({ length: 9 }).map((_, i) => {
          const t = (i - 4) * 30;
          return (
            <g key={i}>
              <line x1={cx - 240 + t * 2} y1={base + 30 - t} x2={cx + t * 2} y2={base + 150 - t} />
              <line x1={cx + 240 + t * 2} y1={base + 30 + t} x2={cx + t * 2} y2={base - 90 + t} />
            </g>
          );
        })}
      </g>
      {/* glow column */}
      <path d={`M${cx - W},${base} L${cx},${base + H} L${cx + W},${base} L${cx + W},${base - gap * (floors - 1)} L${cx},${base - gap * (floors - 1) - H} L${cx - W},${base - gap * (floors - 1)} Z`} fill="url(#towerGlow)" opacity="0.25" />
      {/* columns */}
      <g stroke="hsl(var(--primary) / 0.7)" strokeWidth="1.25" fill="none">
        {[[cx - W, 0], [cx, H], [cx + W, 0], [cx, -H]].map(([x, dy], i) => (
          <line
            key={i}
            x1={x} y1={base + dy} x2={x} y2={base + dy - gap * (floors - 1)}
            className="animate-draw"
            style={{ ["--len" as string]: gap * floors, animationDelay: `${0.2 + i * 0.1}s` }}
            strokeDasharray={i === 3 ? "3 4" : undefined}
          />
        ))}
      </g>
      {/* floor plates */}
      {Array.from({ length: floors }).map((_, i) => {
        const y = base - i * gap;
        const top = i === floors - 1;
        return (
          <path
            key={i}
            d={plate(y)}
            fill={top ? "hsl(var(--primary) / 0.12)" : "hsl(var(--foreground) / 0.015)"}
            stroke={top ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.35)"}
            strokeWidth={top ? 1.5 : 1}
            className="animate-draw"
            style={{ ["--len" as string]: 560, animationDelay: `${0.4 + i * 0.16}s` }}
          />
        );
      })}
      {/* crane */}
      <g stroke="hsl(var(--data) / 0.8)" strokeWidth="1.25" fill="none" className="animate-draw" style={{ ["--len" as string]: 600, animationDelay: "1.6s" }}>
        <path d={`M${cx + 70},${base - gap * (floors - 1) - 20} L${cx + 70},${base - gap * floors - 120} L${cx - 90},${base - gap * floors - 100} M${cx + 70},${base - gap * floors - 120} L${cx + 140},${base - gap * floors - 110}`} />
        <path d={`M${cx - 60},${base - gap * floors - 103} L${cx - 60},${base - gap * floors - 50}`} strokeDasharray="2 3" />
      </g>
      {/* survey markers */}
      {[[cx - W, base, "A1"], [cx + W, base, "B1"], [cx, base - gap * (floors - 1) - H, "L7"]].map(([x, y, l], i) => (
        <g key={i} className="animate-fade-in" style={{ animationDelay: `${1.8 + i * 0.15}s` }}>
          <circle cx={x as number} cy={y as number} r="3" fill="hsl(var(--primary))" />
          <circle cx={x as number} cy={y as number} r="9" fill="none" stroke="hsl(var(--primary) / 0.4)" />
          <text x={(x as number) + 14} y={(y as number) + 4} fontSize="10" fontFamily="Geist Mono, monospace" fill="hsl(var(--muted-foreground))">{l as string}</text>
        </g>
      ))}
    </svg>
  );
}

const PILLARS = [
  { k: "Build", v: "Schedule, RFIs, submittals, punch" },
  { k: "Operate", v: "Budgets, draws, tenants, work orders" },
  { k: "Own", v: "Portfolio, lenders, compliance" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, session } = useAuth();
  const isLogin = mode === "signin";

  // The auth screen is always dark — it's the brand moment.
  useEffect(() => {
    const root = document.documentElement;
    const had = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!had) root.classList.remove("dark");
    };
  }, []);

  if (session) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) return void toast.error(friendly(error.message));
        navigate("/");
      } else {
        const { error } = await signUp(email, password, displayName || undefined);
        if (error) return void toast.error(friendly(error.message));
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          toast.success("Account created — please sign in.");
          setMode("signin");
          return;
        }
        toast.success("Welcome to SiteSync.");
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) return void toast.error("Enter your email first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return void toast.error(error.message);
    toast.success("Password reset link sent.");
  };

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
          <div className="aspect-square w-full max-w-[520px]">
            <BlueprintTower />
          </div>
        </div>

        <div className="relative z-10 space-y-8 p-10 pt-0">
          <h2 className="ss-display max-w-lg text-[44px] leading-[1]">
            The operating system for the <span className="italic text-primary">built world</span>.
          </h2>
          <dl className="grid max-w-lg grid-cols-3 gap-6 border-t pt-6">
            {PILLARS.map((t, i) => (
              <div key={t.k} className="space-y-1.5">
                <dt className="flex items-center gap-2 text-sm font-medium">
                  <span className="font-mono text-[10px] text-primary">0{i + 1}</span>
                  {t.k}
                </dt>
                <dd className="text-xs leading-relaxed text-muted-foreground">{t.v}</dd>
              </div>
            ))}
          </dl>
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

          <p className="ss-eyebrow mb-3">{isLogin ? "Welcome back" : "Get started"}</p>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            {isLogin ? "Sign in to your workspace" : "Create your workspace"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLogin ? "Build, operate and own — from one console." : "Set up your account in under a minute."}
          </p>

          {/* mode switch */}
          <div className="mt-8 grid grid-cols-2 rounded-lg border bg-surface-2/60 p-0.5" role="tablist">
            {(["signin", "signup"] as const).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={mode === k}
                onClick={() => setMode(k)}
                className={cn(
                  "h-8 rounded-md text-[13px] font-medium transition-all",
                  mode === k ? "bg-surface-1 text-foreground shadow-[0_0_0_1px_hsl(var(--border)),0_1px_2px_hsl(var(--shadow-color)/0.3)]" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {k === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {IS_DEMO && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-data/30 bg-data/[0.07] p-3 text-[13px]">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-data" />
              <div className="space-y-2">
                <p><span className="font-medium text-foreground">Demo workspace.</span> <span className="text-muted-foreground">Any email and password works — data stays in your browser.</span></p>
                <button
                  type="button"
                  onClick={() => { setEmail("demo@sitesync.dev"); setPassword("demo-password"); }}
                  className="font-medium text-data hover:underline"
                >
                  Fill in demo credentials →
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {!isLogin && (
              <div className="space-y-1.5 animate-fade-in">
                <Label htmlFor="name" className="text-xs text-muted-foreground">Full name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="name" autoComplete="name" placeholder="Jordan Reyes" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-11 pl-9" />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground">Work email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 pl-9" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
                {isLogin && (
                  <button type="button" className="text-xs text-muted-foreground transition-colors hover:text-primary" onClick={handleForgotPassword}>
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-9 pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" size="lg" className="group w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : null}
              {loading ? "Authenticating…" : isLogin ? "Sign in" : "Create account"}
              {!loading && <ArrowRight className="transition-transform group-hover:translate-x-0.5" />}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            {IS_DEMO ? "Running on sample data · connect Supabase for live projects" : "Protected by row-level security · SOC 2-ready audit trail"}
          </p>
        </div>

        <footer className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
          <span>Build</span><span>·</span><span>Operate</span><span>·</span><span>Own</span>
        </footer>
      </main>
    </div>
  );
}
