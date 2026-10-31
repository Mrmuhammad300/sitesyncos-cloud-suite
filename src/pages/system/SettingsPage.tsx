import { useEffect, useState, type ReactNode } from "react";
import { Bell, Building2, Check, KeyRound, Monitor, Moon, Palette, Sun, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, StatusPill } from "@/components/os";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

/** Non-theme display preferences. Theme itself lives in useTheme(). */
const PREFS_KEY = "sitesync-preferences";
const LEGACY_KEY = "sitesyncos-appearance";

interface Prefs { compactTables: boolean; landingPage: string; units: "imperial" | "metric" }

function loadPrefs(): Prefs {
  const fallback: Prefs = { compactTables: false, landingPage: "dashboard", units: "imperial" };
  try {
    const raw = localStorage.getItem(PREFS_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return { ...fallback, compactTables: !!p.compactTables, landingPage: p.landingPage ?? fallback.landingPage, units: p.units ?? fallback.units };
    }
  } catch {
    /* ignore malformed storage */
  }
  return fallback;
}

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "workspace", label: "Workspace", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: KeyRound },
] as const;

const NOTIFY = [
  { label: "RFI updates", desc: "When an RFI is assigned to you or updated", module: "Build" },
  { label: "Draw request approvals", desc: "When a draw is approved or rejected", module: "Ops" },
  { label: "Budget alerts", desc: "When a budget line exceeds threshold", module: "Ops" },
  { label: "Daily report reminders", desc: "Reminder to file end-of-day reports", module: "Build" },
  { label: "System announcements", desc: "Platform updates and maintenance", module: "System" },
];
const MOD_TAG: Record<string, string> = {
  Build: "border-mod-build/25 bg-mod-build/10 text-mod-build",
  Ops: "border-mod-ops/25 bg-mod-ops/10 text-mod-ops",
  System: "border-border bg-muted text-muted-foreground",
};

/**
 * Miniature app UI. Light previews are drawn with *inverted* tokens when the
 * app is dark (and vice versa) so every card stays token-only.
 */
function ThemePreview({ invert }: { invert: boolean }) {
  const bg = invert ? "bg-foreground" : "bg-background";
  const panel = invert ? "bg-background/10 border-background/15" : "bg-surface-2 border-border";
  const line = invert ? "bg-background/25" : "bg-foreground/15";
  const faint = invert ? "bg-background/10" : "bg-foreground/[0.08]";
  return (
    <div className={cn("flex h-full w-full gap-1.5 p-2", bg)}>
      <div className={cn("flex w-1/4 flex-col gap-1 rounded-[4px] border p-1", panel)}>
        <span className="h-1.5 w-1.5 rounded-[2px] bg-primary" />
        {[0, 1, 2, 3].map((i) => <span key={i} className={cn("h-1 rounded-full", i === 1 ? "bg-primary/70" : line)} style={{ width: `${80 - i * 12}%` }} />)}
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <span className={cn("h-1.5 w-2/5 rounded-full", line)} />
        <div className="grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => <span key={i} className={cn("h-4 rounded-[3px] border", panel)} />)}
        </div>
        <div className={cn("flex flex-1 items-end gap-0.5 rounded-[3px] border p-1", panel)}>
          {[40, 65, 50, 80, 60, 90].map((h, i) => <span key={i} className={cn("flex-1 rounded-[1px]", i === 5 ? "bg-primary" : faint)} style={{ height: `${h}%` }} />)}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children, stack }: { label: string; hint?: string; children: ReactNode; stack?: boolean }) {
  return (
    <div className={cn("flex gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between", stack ? "flex-col" : "flex-row items-center justify-between")}>
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, profile, updateProfile } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [active, setActive] = useState<string>("profile");

  useEffect(() => {
    if (profile?.display_name && !displayName) setDisplayName(profile.display_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.display_name]);

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
    document.documentElement.dataset.compactTables = prefs.compactTables ? "true" : "false";
  }, [prefs]);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await updateProfile({ display_name: displayName.trim() || null });
    setSaving(false);
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
    } else {
      toast.success("Profile updated successfully");
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    const { error } = await import("@/integrations/supabase/client").then(m =>
      m.supabase.auth.resetPasswordForEmail(user.email!, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    );
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent — check your inbox");
    }
  };

  const jump = (id: string) => {
    setActive(id);
    document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const initials = (profile?.display_name || user?.email || "?").split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const dirty = (displayName.trim() || null) !== (profile?.display_name ?? null);
  const dark = resolvedTheme === "dark";
  const themes: { key: ThemePreference; label: string; icon: typeof Sun; hint: string }[] = [
    { key: "light", label: "Light", icon: Sun, hint: "Drafting paper" },
    { key: "dark", label: "Dark", icon: Moon, hint: "Control room" },
    { key: "system", label: "System", icon: Monitor, hint: "Follow OS" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your profile, how SiteSync looks, and what it tells you about." />

      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Section nav */}
        <nav aria-label="Settings sections" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
          <ul className="flex gap-1 lg:sticky lg:top-6 lg:flex-col">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  onClick={() => jump(id)}
                  aria-current={active === id}
                  className={cn(
                    "flex h-9 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 text-[13px] transition-colors lg:w-full",
                    active === id ? "bg-surface-3 font-medium text-foreground shadow-[0_0_0_1px_hsl(var(--border))]" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 max-w-3xl space-y-4">
          {/* Profile */}
          <Panel id="settings-profile" eyebrow="Profile" title="Your account" className="scroll-mt-6">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br from-primary/25 to-primary/5 font-mono text-lg font-medium text-primary">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold">{profile?.display_name || "Unnamed user"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <StatusPill status={(profile?.role ?? "field_staff").replace(/_/g, " ")} tone="primary" className="ml-auto hidden capitalize sm:inline-flex" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="display-name" className="text-xs text-muted-foreground">Display name</Label>
                  <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
                  <Input id="email" value={user?.email ?? ""} disabled />
                </div>
              </div>
              <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">Role changes must be made by an administrator.</p>
                <Button size="sm" onClick={handleSaveProfile} disabled={saving || !dirty}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </Panel>

          {/* Appearance */}
          <Panel id="settings-appearance" eyebrow="Appearance" title="Theme" description="Saved to this device. Applies instantly." className="scroll-mt-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-label="Theme">
              {themes.map(({ key, label, icon: Icon, hint }) => {
                const selected = theme === key;
                const invertFor = (t: "light" | "dark") => (t === "light" ? dark : !dark);
                return (
                  <button
                    key={key}
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTheme(key)}
                    className={cn(
                      "group overflow-hidden rounded-xl border text-left transition-[border-color,box-shadow] duration-200",
                      selected ? "border-primary/60 shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]" : "hover:border-border-strong",
                    )}
                  >
                    <div className="relative aspect-[16/9] border-b">
                      {key === "system" ? (
                        <div className="absolute inset-0">
                          <div className="absolute inset-0"><ThemePreview invert={invertFor("dark")} /></div>
                          <div className="absolute inset-0 [clip-path:polygon(0_0,100%_0,0_100%)]"><ThemePreview invert={invertFor("light")} /></div>
                        </div>
                      ) : (
                        <ThemePreview invert={invertFor(key)} />
                      )}
                      {selected && (
                        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 px-2.5 py-2 sm:px-3 sm:py-2.5">
                      <Icon className={cn("h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-[13px] font-medium">{label}</span>
                      <span className="ml-auto hidden text-[11px] text-muted-foreground md:inline">{hint}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 divide-y border-t pt-4">
              <Field label="Compact tables" hint="Reduce row height in data tables">
                <Switch checked={prefs.compactTables} onCheckedChange={(v) => setPrefs((p) => ({ ...p, compactTables: v }))} aria-label="Compact tables" />
              </Field>
            </div>
          </Panel>

          {/* Workspace */}
          <Panel id="settings-workspace" eyebrow="Workspace" title="Defaults" className="scroll-mt-6">
            <div className="divide-y">
              <Field stack label="Default landing page" hint="Where SiteSync opens after sign-in">
                <Select value={prefs.landingPage} onValueChange={(v) => setPrefs((p) => ({ ...p, landingPage: v }))}>
                  <SelectTrigger className="w-full sm:w-[200px]" aria-label="Default landing page"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="projects">Projects</SelectItem>
                    <SelectItem value="notifications">Notifications</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field stack label="Measurement units" hint="Used for areas and dimensions in Spatial">
                <div className="grid grid-cols-2 rounded-lg border bg-surface-2/60 p-0.5" role="radiogroup" aria-label="Units">
                  {(["imperial", "metric"] as const).map((u) => (
                    <button
                      key={u}
                      role="radio"
                      aria-checked={prefs.units === u}
                      onClick={() => setPrefs((p) => ({ ...p, units: u }))}
                      className={cn("h-7 rounded-md px-3 text-xs font-medium transition-colors", prefs.units === u ? "bg-surface-1 text-foreground shadow-[0_0_0_1px_hsl(var(--border))]" : "text-muted-foreground hover:text-foreground")}
                    >
                      <span className="capitalize">{u}</span> <span className="ss-num text-muted-foreground">{u === "imperial" ? "ft" : "m"}</span>
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Panel>

          {/* Notifications */}
          <Panel id="settings-notifications" eyebrow="Notifications" title="What reaches you" className="scroll-mt-6">
            <div className="divide-y">
              {NOTIFY.map((item) => (
                <Field
                  key={item.label}
                  label={item.label}
                  hint={item.desc}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("ss-pill hidden font-mono sm:inline-flex text-[10px] uppercase tracking-wider", MOD_TAG[item.module])}>{item.module}</span>
                    <Switch defaultChecked aria-label={item.label} />
                  </div>
                </Field>
              ))}
            </div>
          </Panel>

          {/* Security */}
          <Panel id="settings-security" eyebrow="Security" title="Password & session" className="scroll-mt-6">
            <div className="divide-y">
              <Field stack label="Password" hint={`A reset link will be sent to ${user?.email ?? "your email"}.`}>
                <Button size="sm" variant="outline" onClick={handleChangePassword}>
                  <KeyRound /> Send reset email
                </Button>
              </Field>
              <Field label="Last sign-in" hint="Most recent authenticated session">
                <span className="ss-num text-xs text-muted-foreground">
                  {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}
                </span>
              </Field>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
