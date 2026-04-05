import { ReactNode } from "react";
import { useRole, AppRole } from "@/hooks/useRole";

interface CanAccessProps {
  /** Require at least one of these roles. */
  roles: AppRole | AppRole[];
  /** Rendered when access is denied. Defaults to null (hidden). */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders children based on the current user's role.
 *
 * @example
 * <CanAccess roles={["admin", "super_admin"]}>
 *   <Button>Delete</Button>
 * </CanAccess>
 */
export function CanAccess({ roles, fallback = null, children }: CanAccessProps) {
  const { hasRole } = useRole();
  return hasRole(roles) ? <>{children}</> : <>{fallback}</>;
}
