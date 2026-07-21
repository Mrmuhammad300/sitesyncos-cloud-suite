import { Building2, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const APPEARANCE_KEY = "sitesyncos-appearance";

function getStoredDark(): boolean {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    if (raw) return (JSON.parse(raw) as { darkMode?: boolean }).darkMode ?? false;
  } catch {}
  return document.documentElement.classList.contains("dark");
}

export function FieldLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(getStoredDark);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-14 flex items-center gap-2 border-b border-border bg-card/50 backdrop-blur-sm px-4 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
          <Building2 className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-tight">Field Mode</span>
          <span className="text-[10px] text-muted-foreground">{profile?.display_name || "Crew"}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground" onClick={() => setDark((d) => !d)}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4">{children}</main>
    </div>
  );
}
