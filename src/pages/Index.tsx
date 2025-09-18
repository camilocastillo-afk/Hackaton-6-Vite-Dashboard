import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "RRHH Bewe — Inicio";
    supabase.auth.getSession().then(({ data: { session } }) => {
      navigate(session ? "/home" : "/auth", { replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1>RRHH Bewe</h1>
        <p className="text-lg text-muted-foreground">Plataforma de gestión de RRHH</p>
        <Button onClick={() => navigate("/auth")}>Acceder</Button>
      </div>
    </div>
  );
};

export default Index;
