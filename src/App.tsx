import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Employees from "./pages/Employees";
import { RequireAuth } from "./components/RequireAuth";
import AppLayout from "./components/AppLayout";
import Home from "./pages/Home";
import Solicitudes from "./pages/Solicitudes";
import Admin from "./pages/Admin";
import { RequireRole } from "./components/RequireRole";
import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* Rutas protegidas con layout y menú */}
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route path="/home" element={<Home />} />
              <Route path="/empleados" element={<Employees />} />
              <Route path="/solicitudes" element={<Solicitudes />} />
              <Route path="/admin" element={<RequireRole roles={["admin"]}><Admin /></RequireRole>} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
