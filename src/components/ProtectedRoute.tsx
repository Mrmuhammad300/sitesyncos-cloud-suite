import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import { BootScreen } from "@/components/os/Loaders";
import { Lock } from "lucide-react";

type AppRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: AppRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { session, loading, profile } = useAuth();

  if (loading) return <BootScreen />;

  if (!session) return <Navigate to="/login" replace />;

  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = profile?.role as AppRole | undefined;
    if (!userRole || !requiredRoles.includes(userRole)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-destructive/25 bg-destructive/10 text-destructive">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Access Restricted</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your role ({userRole ?? "unknown"}) does not have permission to view this page.
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
