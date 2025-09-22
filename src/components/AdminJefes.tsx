import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2 } from "lucide-react";
import { toast } from "sonner";
import { normalize } from "path";

interface JefeRow {
  area_id: string;
  empleado_id: string;
  empleados?: { id: string; nombres: string | null; apellidos: string | null; correo: string | null } | null;
  areas?: { id: string; nombre: string | null } | null;
}

// No joins for now; show raw ids only

export default function AdminJefes() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 7;

  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<JefeRow | null>(null);
  const [empQuery, setEmpQuery] = useState("");
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-jefes"],
    queryFn: async (): Promise<JefeRow[]> => {
      // Traer solo jefes sin joins; esta tabla no tiene id propio
      const { data, error } = await supabase
        .from("jefes")
        .select(`
            area_id,
            empleado_id,
            empleados:empleado_id ( id, nombres, apellidos, correo ),
            areas:area_id ( id, nombre )
        `);
    
      if (error) throw error;
      // Supabase puede devolver arrays para relaciones si hay múltiples; normalizamos al primer elemento
      const normalized = (data as any[]).map((row) => ({
        area_id: row.area_id,
        empleado_id: row.empleado_id,
        empleados: Array.isArray(row.empleados) ? row.empleados[0] ?? null : row.empleados ?? null,
        areas: Array.isArray(row.areas) ? row.areas[0] ?? null : row.areas ?? null,
      })) as JefeRow[];
      return normalized;
    },
  });

  // Opciones de empleados para autocompletar por nombre
  const empleadosOptions = useQuery({
    queryKey: ["empleados-options", empQuery],
    enabled: editOpen && empQuery.trim().length > 0,
    queryFn: async (): Promise<{ id: string; nombres: string; apellidos: string; correo: string }[]> => {
      const q = empQuery.trim();
      const { data, error } = await supabase
        .from("empleados")
        .select("id,nombres,apellidos,correo")
        .or(`nombres.ilike.%${q}%,apellidos.ilike.%${q}%`)
        .limit(10);
      if (error) throw error;
      return (data as any[]) as { id: string; nombres: string; apellidos: string; correo: string }[];
    },
  });

  // Actualiza el jefe del área seleccionada
  const updateJefeArea = async (): Promise<void> => {
    if (!selected?.area_id) {
      toast.error("No hay área seleccionada");
      return;
    }
    const empleadoId = selectedEmpleadoId ?? selected?.empleado_id ?? null;
    if (!empleadoId) {
      toast.error("Selecciona un empleado");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("jefes")
        .upsert({ area_id: selected.area_id, empleado_id: empleadoId }, { onConflict: "area_id" });
      if (error) throw error;
      toast.success("Jefe actualizado");
      setEditOpen(false);
      setSelectedEmpleadoId(null);
      setEmpQuery("");
      await refetch();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "No se pudo actualizar el jefe");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    const list = (data ?? []) as JefeRow[];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => {
      const haystack = [
        row.empleados?.nombres ?? "",
        row.empleados?.apellidos ?? "",
        row.empleados?.correo ?? "",
        row.areas?.nombre ?? "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  const header = useMemo(() => (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold">Administración de Jefes</h2>
    </div>
  ), []);

  return (
    <div>
      <Card className="notion-card">
        <CardContent className="pt-6 space-y-6">
          {header}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label>Buscar</Label>
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Nombre, correo o documento" />
            </div>
            <div className="flex items-end">
              <Button variant="secondary" className="w-full" onClick={() => refetch()}>Refrescar</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Área</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Apellido</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead className="text-right w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={3}>Cargando...</TableCell></TableRow>
                )}
                {!isLoading && error && (
                  <TableRow><TableCell colSpan={3}>Error al cargar jefes</TableCell></TableRow>
                )}
                {!isLoading && !error && pageItems.length === 0 && (
                  <TableRow><TableCell colSpan={3}>Sin resultados</TableCell></TableRow>
                )}
                {pageItems.map((row, i) => (
                  <TableRow key={`${row.empleado_id ?? "noemp"}-${row.area_id ?? "noarea"}-${i}`} className="hover:bg-muted/40">
                    <TableCell>{row.areas?.nombre ?? "—"}</TableCell>
                    <TableCell>{row.empleados?.nombres ?? "—"}</TableCell>
                    <TableCell>{row.empleados?.apellidos ?? "—"}</TableCell>
                    <TableCell>{row.empleados?.correo ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => { setSelected(row); setEditOpen(true); }}
                        aria-label="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination className="pt-2">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} />
              </PaginationItem>
              <PaginationItem>
                <span className="px-3 text-sm text-muted-foreground">Página {page} de {Math.max(1, totalPages)}</span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); }} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardContent>
      </Card>

    {/* Editar una jefe de área*/}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar jefe</DialogTitle>
            <DialogDescription>Selecciona el nuevo jefe para el área.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await updateJefeArea(); }}>
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>Área</Label>
                <Input value={selected?.areas?.nombre ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Jefe (empleado)</Label>
                <Input
                  placeholder="Buscar por nombre o apellido"
                  value={empQuery}
                  onChange={(e) => setEmpQuery(e.target.value)}
                />
                {empleadosOptions.data && empleadosOptions.data.length > 0 && (
                  <div className="border rounded-md max-h-48 overflow-auto text-sm">
                    {empleadosOptions.data.map((emp) => (
                      <button
                        type="button"
                        key={emp.id}
                        className={`w-full text-left px-3 py-2 hover:bg-muted ${selectedEmpleadoId === emp.id ? "bg-muted" : ""}`}
                        onClick={() => { setSelectedEmpleadoId(emp.id); setEmpQuery(`${emp.nombres ?? ""} ${emp.apellidos ?? ""}`.trim()); }}
                      >
                        <div className="font-medium">{emp.nombres} {emp.apellidos}</div>
                        <div className="text-muted-foreground">{emp.correo}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || !selectedEmpleadoId}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
