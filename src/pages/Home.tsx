import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

interface Solicitud {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  fecha_solicitud: string;
  va_dirigida: boolean;
  nombre_destinatario: string;
  incluir_salario: boolean;
  incluir_extras: boolean;
  detalle_extras: string;
  incluir_funciones: boolean;
  estado: string;
  user_id: string;
}


export default function Home() {
  useEffect(() => {
    document.title = "RRHH Bewe — Home";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Dashboard de solicitudes: resumen y gráficas RRHH Bewe");
  }, []);

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const getRange = () => {
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(now.getDate() - 6);
    return {
      start: startDate ?? defaultStart,
      end: endDate ?? now,
    };
  };

  function endOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  }

  const { data, isLoading } = useQuery({
    queryKey: [
      "dashboard-solicitudes",
      startDate ? startDate.toISOString() : null,
      endDate ? endDate.toISOString() : null,
    ],
    queryFn: async () => {
      const { start, end } = getRange();
      const { data, error } = await supabase
        .from("certificaciones_solicitudes")
        .select("*")
        .gte("fecha_solicitud", start.toISOString())
        .lte("fecha_solicitud", endOfDay(end).toISOString());
      if (error) throw error;
      return (data || []) as Solicitud[];
    },
  });

  const last7 = useMemo(() => {
    const { start, end } = getRange();
    const days: { label: string; dateKey: string }[] = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    while (cursor <= endDay) {
      const dateKey = cursor.toISOString().slice(0, 10);
      const label = cursor.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
      days.push({ label, dateKey });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [startDate, endDate]);

  const barData = useMemo(() => {
    const counts: Record<string, number> = {};
    (data || []).forEach((s) => {
      const key = new Date(s.fecha_solicitud).toISOString().slice(0, 10);
      counts[key] = (counts[key] || 0) + 1;
    });
    return last7.map((d) => ({ name: d.label, total: counts[d.dateKey] || 0 }));
  }, [data, last7]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      "En Progreso": 0,
      "Procesada": 0,
      "Rechazada": 0,
    };

    (data || []).forEach((s) => {
      const estado = s.estado?.trim().toLowerCase();
      if (estado === "procesada") counts["Procesada"] += 1;
      else if (estado === "rechazada") counts["Rechazada"] += 1;
      else counts["En Progreso"] += 1; // Default/fallback
    });

    return [
      { name: "En Progreso", value: counts["En Progreso"] },
      { name: "Procesada", value: counts["Procesada"] },
      { name: "Rechazada", value: counts["Rechazada"] },
    ];
  }, [data]);


  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-6))",
    "hsl(var(--chart-7))",
    "hsl(var(--chart-8))",
  ]; // semantic tokens de alto contraste
  // Top solicitantes por nombre completo
  const topEmployeesData = useMemo(() => {
    const counts: Record<string, { name: string; total: number }> = {};
    (data || []).forEach((s) => {
      const name = `${s.nombre} ${s.apellido}`.trim() || "Sin nombre";
      if (!counts[name]) counts[name] = { name, total: 0 };
      counts[name].total += 1;
    });
    const entries = Object.values(counts);
    entries.sort((a, b) => b.total - a.total);
    return entries.slice(0, 5);
  }, [data]);

  const directedData = useMemo(() => {
    const total = (data || []).length;
    const dirigida = (data || []).filter((s) => s.va_dirigida === true).length;
    const noDirigida = (data || []).filter((s) => s.va_dirigida === false).length;
    const sinDato = total - dirigida - noDirigida;
    return [
      { name: "Dirigida", value: dirigida },
      { name: "No dirigida", value: noDirigida },
      { name: "Sin dato", value: sinDato },
    ];
  }, [data]);


  return (
    <div className="mx-auto max-w-7xl p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Resumen de solicitudes</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Desde</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start", !startDate && "text-muted-foreground")}> 
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? new Date(startDate).toLocaleDateString("es-ES") : "Selecciona fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Hasta</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start", !endDate && "text-muted-foreground")}> 
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? new Date(endDate).toLocaleDateString("es-ES") : "Selecciona fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="hidden md:block" />
        <div className="flex items-end">
          <Button variant="secondary" className="w-full" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
            Limpiar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes por día</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ total: { label: 'Solicitudes', color: 'hsl(var(--primary))' } }} className="h-64 w-full">
              <BarChart data={barData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" radius={[8,8,4,4]}>
                  {barData.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado general</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{
              'En Progreso': { label: 'En Progreso', color: 'hsl(var(--chart-2))' },
              Procesada: { label: 'Procesada', color: 'hsl(var(--chart-3))' },
              Rechazada: { label: 'Rechazada', color: 'hsl(var(--chart-4))' },
            }}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={3} label>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top solicitantes</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ total: { label: 'Solicitudes', color: 'hsl(var(--primary))' } }} className="h-64 w-full">
              <BarChart data={topEmployeesData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" interval={0} angle={-15} height={50} textAnchor="end" />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" radius={[8,8,4,4]}>
                  {topEmployeesData.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>¿Va dirigida?</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{
              Dirigida: { label: 'Dirigida', color: 'hsl(var(--chart-1))' },
              'No dirigida': { label: 'No dirigida', color: 'hsl(var(--chart-2))' },
              'Sin dato': { label: 'Sin dato', color: 'hsl(var(--chart-5))' },
            }}>
              <PieChart>
                <Pie data={directedData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={3} label>
                  {directedData.map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando…</p>}
    </div>
  );
}
