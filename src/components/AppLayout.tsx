import { Fragment, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, LogOut, Monitor, Moon, Settings, Sun, User } from "lucide-react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
import { getRouteMeta } from "@/lib/modules";
import { cn } from "@/lib/utils";

function readSidebarCookie(): boolean {
  const m = document.cookie.match(/(?:^|;\s*)sidebar:state=(true|false)/);
  return m ? m[1] === "true" : true;
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
      {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

function Breadcrumbs() {
  const { pathname } = useLocation();
  const meta = getRouteMeta(pathname);
  const crumbs = meta
    ? meta.module.key === "overview" && meta.item.url === "/"
      ? [{ label: "Dashboard" }]
      : [{ label: meta.module.label, tone: meta.module.tone }, { label: meta.item.title }]
    : [{ label: "Not found" }];

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[13px] md:flex">
      {crumbs.map((c, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
          <span
            className={cn(
              "flex items-center gap-1.5 truncate",
              i === crumbs.length - 1 ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {"tone" in c && c.tone && <span className={cn("h-1.5 w-1.5 rounded-[2px]", `bg-${c.tone}`)} />}
            {c.label}
          </span>
        </Fragment>
      ))}
    </nav>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user, signOut } = useAuth();
  const { theme, resolvedTheme, setTheme, toggle } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Operator";
  const initials = displayName.split(/[\s._-]+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  // Reset scroll on navigation.
  useEffect(() => {
    document.getElementById("main-scroll")?.scrollTo({ top: 0 });
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <SidebarProvider defaultOpen={readSidebarCookie()}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <AppSidebar />
      <SidebarInset className="h-svh min-w-0 overflow-hidden bg-background">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/75 px-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 sm:px-4">
          <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
          <div className="h-4 w-px bg-border" />
          <Breadcrumbs />

          <div className="mx-auto flex w-full max-w-md flex-1 justify-center md:px-4">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-1">
            <div className="mr-2 hidden items-center gap-2 rounded-full border bg-surface-1/60 py-1 pl-2 pr-2.5 xl:flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              <span className="text-[11px] text-muted-foreground">All systems nominal</span>
              <span className="h-3 w-px bg-border" />
              <LiveClock />
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggle} aria-label="Toggle theme">
                  {resolvedTheme === "dark" ? <Sun /> : <Moon />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8" asChild aria-label="Notifications">
                  <Link to="/notifications">
                    <Bell />
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ml-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary/80 to-mod-vault/80 text-[11px] font-semibold text-primary-foreground ring-offset-background transition-shadow hover:ring-2 hover:ring-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Account menu"
                >
                  {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <User className="h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="ss-eyebrow py-1">Theme</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemePreference)}>
                  <DropdownMenuRadioItem value="light"><Sun className="h-4 w-4" /> Light</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark"><Moon className="h-4 w-4" /> Dark</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system"><Monitor className="h-4 w-4" /> System</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main id="main-scroll" className="relative flex-1 overflow-y-auto overflow-x-hidden">
          <div className="ss-blueprint ss-blueprint-fade pointer-events-none absolute inset-x-0 top-0 h-[420px]" aria-hidden />
          <div
            className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-primary/[0.06] blur-3xl"
            aria-hidden
          />
          <div id="main-content" className="relative mx-auto w-full max-w-[1600px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
