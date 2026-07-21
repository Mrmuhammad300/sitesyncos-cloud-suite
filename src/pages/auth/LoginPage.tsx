import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, Eye, EyeOff, User, HardHat, Settings, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, session } = useAuth();

  if (session) { navigate("/", { replace: true }); return null; }

  const friendly = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes("weak") || m.includes("pwned")) return "That password has been found in a data breach — please choose a stronger, unique one.";
    if (m.includes("email not confirmed")) return "Check your inbox to confirm your email.";
    if (m.includes("invalid login") || m.includes("invalid_credentials")) return "Wrong email or password.";
    if (m.includes("already registered") || m.includes("user already")) return "That email is already registered — sign in instead.";
    if (m.includes("rate limit") || m.includes("over_email_send")) return "Too many attempts — try again shortly.";
    if (m.includes("password") && m.includes("6")) return "Password must be at least 6 characters.";
    return msg;
  };
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) { toast.error(friendly(error.message)); setLoading(false); return; }
      navigate("/");
    } else {
      const { error } = await signUp(email, password, displayName || undefined);
      if (error) { toast.error(friendly(error.message)); setLoading(false); return; }
      // Auto-confirm is on; sign the user in immediately.
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        toast.success("Account created! Please sign in.");
        setIsLogin(true);
        setLoading(false);
        return;
      }
      toast.success("Welcome to SiteSync!");
      navigate("/");
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) { toast.error("Enter your email first"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Password reset email sent!");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden dark"
         style={{ background: "linear-gradient(135deg, hsl(222 47% 4%), hsl(222 47% 8%), hsl(222 47% 4%))" }}>
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-[0.03]"
           style={{ background: "radial-gradient(circle, hsl(217 91% 60%), transparent)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full opacity-[0.04]"
           style={{ background: "radial-gradient(circle, hsl(262 83% 58%), transparent)" }} />

      {/* Module pills at top */}
      <div className="flex gap-3 mb-10 animate-slide-up" style={{ animationDelay: "0.1s" }}>
        {[
          { icon: HardHat, label: "BUILD", sub: "Project Delivery" },
          { icon: Settings, label: "OPS", sub: "Asset Management" },
          { icon: Shield, label: "VAULT", sub: "Investment Intelligence" },
        ].map((m) => (
          <div key={m.label} className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg"
               style={{
                 background: "hsl(222 41% 10% / 0.6)",
                 border: "1px solid hsl(217 91% 60% / 0.15)",
               }}>
            <m.icon className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs font-bold text-foreground tracking-wide">{m.label}</p>
              <p className="text-[9px] text-muted-foreground">{m.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Logo */}
      <div className="text-center mb-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center"
               style={{
                 background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(217 91% 50%))",
                 boxShadow: "0 0 24px hsl(217 91% 60% / 0.3)",
               }}>
            <span className="text-xl font-black text-primary-foreground">S</span>
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">SiteSync</h1>
            <p className="text-[11px] font-medium text-muted-foreground tracking-[0.2em]">Build. Operate. Own.</p>
          </div>
        </div>
      </div>

      {/* Login card */}
      <div className="w-full max-w-sm px-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
        <div className="ss-card-glow p-6 rounded-xl">
          <p className="text-sm font-medium text-muted-foreground text-center mb-5">
            {isLogin ? "Sign in to your account" : "Create your account"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Display Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                         className="pl-9 h-10 bg-secondary/50 border-border" />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="you@company.com" value={email}
                       onChange={(e) => setEmail(e.target.value)}
                       className="pl-9 h-10 bg-secondary/50 border-border" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password}
                       onChange={(e) => setPassword(e.target.value)}
                       className="pl-9 pr-9 h-10 bg-secondary/50 border-border" required />
                <button type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="text-right">
                <button type="button" className="text-xs text-primary hover:underline" onClick={handleForgotPassword}>
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full h-10 font-semibold" disabled={loading}
                    style={{
                      background: "linear-gradient(135deg, hsl(217 91% 60%), hsl(217 91% 50%))",
                      boxShadow: "0 0 16px hsl(217 91% 60% / 0.25)",
                    }}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button className="text-primary hover:underline font-medium" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-8 text-[10px] text-muted-foreground/60 animate-slide-up" style={{ animationDelay: "0.4s" }}>
        Enterprise Construction & Real Estate Operating System
      </p>
    </div>
  );
}
