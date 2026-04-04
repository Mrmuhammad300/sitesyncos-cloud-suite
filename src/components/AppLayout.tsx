import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { Bell, Sun, Moon, LogOut, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { GlobalSearch } from "@/components/GlobalSearch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useAppStore, selectUnreadCount, selectIsOffline } from "@/store/useAppStore";

const APPEARANCE_KEY = "sitesyncos-appearance";

function getStoredDark(): boolean {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    if (raw) return (JSON.parse(raw) as { darkMode?: boolean }).darkMode ?? false;
  } catch {}
  return document.documentElement.classList.contains("dark");
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(getStoredDark);
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const unreadCount = useAppStore(selectUnreadCount);
  const isOffline = useAppStore(selectIsOffline);
  const setOffline = useAppStore((s) => s.setOffline);
  const clearUnread = useAppStore((s) => s.clearUnread);

  // Subscribe to realtime updates for all modules
  useRealtimeSync();

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOffline]);

  // Keep DOM in sync with state
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Sync if SettingsPage changes localStorage from another tab or navigation
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === APPEARANCE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as { darkMode?: boolean };
          if (typeof parsed.darkMode === "boolean") setDark(parsed.darkMode);
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = () => {
    setDark((prev) => {
      const next = !prev;
      try {
        const raw = localStorage.getItem(APPEARANCE_KEY);
        const existing = raw ? JSON.parse(raw) : {};
        localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ ...existing, darkMode: next }));
      } catch {}
      return next;
    });
  };

  const initials = profile?.display_name
    ? profile.display_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? "??";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 border-b bg-card px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground" />
            <Separator orientation="vertical" className="h-5 mx-1" />
            <div className="flex-1 max-w-md">
              <GlobalSearch />
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9" onClick={toggleTheme}>
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              {isOffline && (
                <div className="flex items-center gap-1 text-xs text-destructive px-2 py-1 bg-destructive/10 rounded">
                  <WifiOff className="h-3 w-3" />
                  <span>Offline</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground h-9 w-9 relative"
                onClick={() => { navigate("/notifications"); clearUnread(); }}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
              <Separator orientation="vertical" className="h-5 mx-2" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-80">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                      {initials}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{profile?.display_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
