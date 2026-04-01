import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Separator } from "@/components/ui/separator";
import { Bell, Search, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  const toggleTheme = () => {
    setDark(!dark);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 border-b bg-card px-4 shrink-0">
            <SidebarTrigger className="text-muted-foreground" />
            <Separator orientation="vertical" className="h-5 mx-1" />
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects, documents, tasks…"
                className="pl-9 h-9 bg-muted/50 border-0 text-sm focus-visible:ring-1"
              />
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9" onClick={toggleTheme}>
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9 relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
              </Button>
              <Separator orientation="vertical" className="h-5 mx-2" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  JD
                </div>
              </div>
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
