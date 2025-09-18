import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Iniciar sesión — RRHH Bewe";
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/home", { replace: true });
    });
  }, [navigate]);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("¡Bienvenido!");
    navigate("/home", { replace: true });
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md notion-card">
        <CardHeader>
          <CardTitle className="text-2xl">RRHH Bewe</CardTitle>
          <CardDescription>Acceso para el equipo de RRHH</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@bewe.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button onClick={signIn} disabled={loading} className="w-full">{loading ? "Cargando..." : "Ingresar"}</Button>
            <p className="text-xs text-muted-foreground text-center">Si necesitas una cuenta, contacta a un administrador.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
