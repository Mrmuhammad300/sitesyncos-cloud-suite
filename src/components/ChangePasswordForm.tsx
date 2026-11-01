import { useRef, useState, type FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { changePassword } from "@/lib/changePassword";
import { IS_DEMO } from "@/lib/demo";

export function ChangePasswordForm({ account }: { account: { id: string; email?: string } }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const pending = useRef(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current || !account.email || IS_DEMO) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setSuccess(false);
    try {
      // Verification must never overwrite the active user's stored session.
      const verifier = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "sitesync-password-verification" } },
      );
      try {
        await changePassword({
          verify: (email, value) => verifier.auth.signInWithPassword({ email, password: value }),
          update: (attributes) => supabase.auth.updateUser(attributes),
        }, { id: account.id, email: account.email }, current, password, confirm);
      } finally {
        // Invalidate only the temporary verification session, never the main session.
        await verifier.auth.signOut({ scope: "local" }).catch(() => undefined);
      }
      setCurrent("");
      setPassword("");
      setConfirm("");
      setShow(false);
      setSuccess(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Password change failed. Please try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 border-b pb-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Change password</h3>
        <Button type="button" variant="ghost" size="icon" onClick={() => setShow(!show)} aria-label={show ? "Hide passwords" : "Show passwords"} title={show ? "Hide passwords" : "Show passwords"}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      <fieldset disabled={busy || IS_DEMO || !account.email} className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="change-current-password">Current password</Label>
          <Input id="change-current-password" type={show ? "text" : "password"} autoComplete="current-password" value={current} onChange={(e) => { setCurrent(e.target.value); setSuccess(false); }} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="change-new-password">New password</Label>
          <Input id="change-new-password" type={show ? "text" : "password"} autoComplete="new-password" minLength={6} value={password} onChange={(e) => { setPassword(e.target.value); setSuccess(false); }} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="change-confirm-password">Confirm new password</Label>
          <Input id="change-confirm-password" type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setSuccess(false); }} required />
        </div>
      </fieldset>
      {IS_DEMO && <p className="text-xs text-muted-foreground">Password changes are unavailable for demo accounts.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {success && <p role="status" className="text-sm text-success">Password changed successfully.</p>}
      <Button type="submit" size="sm" disabled={busy || !current || !password || !confirm || !account.email || IS_DEMO}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {busy ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}