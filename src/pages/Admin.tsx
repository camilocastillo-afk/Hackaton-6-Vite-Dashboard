import { useEffect, useMemo, useState } from "react";
import AdminUsers from "@/components/AdminUsers";
import AdminJefes from "@/components/AdminJefes";
import AdminAreas from "@/components/AdminAreas";

export default function Admin() {
  

  useEffect(() => {
    document.title = "Administración — RRHH Bewe";
  }, []);

  const getSectionFromHash = () => {
    const hash = (typeof window !== "undefined" ? window.location.hash : "").replace("#", "");
    return hash === "jefes" ? "jefes" : hash === "areas" ? "areas" : "usuarios";
  };

  const [section, setSection] = useState<"usuarios" | "jefes" | "areas">("usuarios");

  useEffect(() => {
    const onHashChange = () => setSection(getSectionFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const nav = useMemo(() => (
    <nav className="flex items-center gap-2">
      <a
        onClick={() => setSection("usuarios")}
        href="#usuarios"
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${section === "usuarios" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
        aria-current={section === "usuarios" ? "page" : undefined}
      >
        Usuarios
      </a>
      <a
        onClick={() => setSection("jefes")}
        href="#jefes"
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${section === "jefes" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
        aria-current={section === "jefes" ? "page" : undefined}
      >
        Jefes
      </a>
      <a
        onClick={() => setSection("areas")}
        href="#areas"
        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${section === "areas" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}
        aria-current={section === "areas" ? "page" : undefined}
      >
        Areas
      </a>
    </nav>
  ), [section]);

  return (
    <div className="min-h-screen notion-container py-8">
      <div className="space-y-6">
        {nav}
        
        {section === "usuarios" && <AdminUsers />}
        {section === "jefes" && <AdminJefes />}
        {section === "areas" && <AdminAreas />}
      </div>
    </div>
  );
}
