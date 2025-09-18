import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export type AppRole = "admin" | "hr";

export function useUserRoles() {
  const { user, loading } = useSupabaseAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    let aborted = false;
    async function fetchRoles() {
      if (!user) {
        if (!aborted) {
          setRoles([]);
          setLoadingRoles(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (!aborted) {
        if (error) {
          console.error("Error fetching roles", error);
          setRoles([]);
        } else {
          setRoles((data ?? []).map((r: any) => r.role as AppRole));
        }
        setLoadingRoles(false);
      }
    }

    if (!loading) fetchRoles();
    return () => {
      aborted = true;
    };
  }, [user, loading]);

  const isAdmin = roles.includes("admin");
  const hasRole = (role: AppRole) => roles.includes(role);

  return { roles, isAdmin, hasRole, loading: loadingRoles };
}
