import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRoles } from "@/hooks/useUserRoles";

export function RequireRole({ roles, children }: { roles: ("admin" | "hr")[]; children: ReactNode }) {
  const { roles: userRoles, loading } = useUserRoles();

  if (loading) return null;

  const allowed = roles.some((r) => userRoles.includes(r));
  if (!allowed) return <Navigate to="/home" replace />;

  return <>{children}</>;
}
