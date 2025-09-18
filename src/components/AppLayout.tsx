import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import ThemeToggle from "@/components/ThemeToggle";

export default function AppLayout() {
  const { isAdmin } = useUserRoles();
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    } finally {
      window.location.replace("/auth");
    }
  };

  useEffect(() => {
    // Ensure viewport meta is set for mobile SEO
    const title = document.title || "RRHH Bewe";
    document.title = title;
  }, []);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
      isActive ? "bg-muted text-primary" : "hover:bg-muted/60"
    );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <nav className="flex items-center gap-2" aria-label="Menú principal">
            <NavLink to="/home" className={linkCls} end>
              Inicio
            </NavLink>
            <NavLink to="/empleados" className={linkCls} end>
              Gestión de empleados
            </NavLink>
            <NavLink to="/solicitudes" className={linkCls} end>
              Gestión de solicitudes
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={linkCls} end>
                Administración
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" onClick={handleLogout} aria-label="Cerrar sesión">
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
