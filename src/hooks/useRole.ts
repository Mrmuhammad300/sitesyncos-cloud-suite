import { useAuth } from "@/hooks/useAuth";

export type AppRole =
  | "super_admin"
  | "admin"
  | "project_manager"
  | "superintendent"
  | "architect"
  | "engineer"
  | "owner"
  | "subcontractor"
  | "lender"
  | "field_staff";

const ADMIN_ROLES: AppRole[] = ["super_admin", "admin"];
const MANAGER_ROLES: AppRole[] = [...ADMIN_ROLES, "project_manager", "superintendent", "architect", "engineer"];

export function useRole() {
  const { profile } = useAuth();
  const role = (profile?.role ?? "field_staff") as AppRole;

  return {
    role,
    isAdmin: ADMIN_ROLES.includes(role),
    isManager: MANAGER_ROLES.includes(role),
    hasRole: (required: AppRole | AppRole[]) => {
      const list = Array.isArray(required) ? required : [required];
      return list.includes(role);
    },
  };
}
