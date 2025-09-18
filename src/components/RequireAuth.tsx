import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useSupabaseAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}
