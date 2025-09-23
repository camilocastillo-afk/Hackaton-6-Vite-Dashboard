import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext, PaginationLink } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PhoneInput, PhoneDisplay } from "@/components/PhoneInput";

interface Empleado {
  id: string;
  documento: number;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  fecha_creacion: string;
  fecha_edicion: string;
  cumpleanos: string;
  dias_vacaciones: number;
}

export default function Employees() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ nombres: "", apellidos: "", correo: "", telefono: "" });
  const [page, setPage] = useState(1);
  const pageSize = 7;

  useEffect(() => { document.title = "Empleados — RRHH Bewe"; }, []);
  useEffect(() => { setPage(1); }, [filters]);

  const fetchEmpleados = async (): Promise<{ data: Empleado[]; count: number }> => {
    let query = supabase
      .from("empleados")
      .select("*", { count: "exact" })
      .order("fecha_creacion", { ascending: false });

    if (filters.nombres) query = query.ilike("nombres", `%${filters.nombres}%`);
    if (filters.apellidos) query = query.ilike("apellidos", `%${filters.apellidos}%`);
    if (filters.correo) query = query.ilike("correo", `%${filters.correo}%`);
    if (filters.telefono) query = query.ilike("telefono", `%${filters.telefono}%`);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;
    return { data: (data as unknown as Empleado[]) ?? [], count: count ?? 0 };
  };

  const { data: empleadosData, isLoading } = useQuery({
    queryKey: ["empleados", filters, page, pageSize],
    queryFn: fetchEmpleados,
  });

  const empleados: Empleado[] = empleadosData?.data ?? [];
  const total: number = empleadosData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const upsertEmpleado = useMutation({
    mutationFn: async (payload: Partial<Empleado>) => {
      const isEdit = !!payload.id;
      if (isEdit) {
        const { error } = await supabase.from("empleados").update({
          documento: payload.documento,
          nombres: payload.nombres,
          apellidos: payload.apellidos,
          correo: payload.correo,
          telefono: payload.telefono,
          fecha_edicion: new Date().toISOString(),
          cumpleanos: payload.cumpleanos ?? null,
          dias_vacaciones: payload.dias_vacaciones ?? 0,
        }).eq("id", payload.id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("empleados").insert({
          documento: payload.documento,
          nombres: payload.nombres ?? "",
          apellidos: payload.apellidos,
          correo: payload.correo,
          telefono: payload.telefono,
          fecha_creacion: new Date().toISOString(),
          fecha_edicion: new Date().toISOString(),
          cumpleanos: payload.cumpleanos ?? null,
          dias_vacaciones: payload.dias_vacaciones ?? 0
        });
        if (error) throw error;

        // Notificación de bienvenida inmediata (no bloqueante)
        const nombre = (payload.nombres ?? "").trim();
        const telefono = (payload.telefono ?? "").trim();
        if (telefono) {
          fetch("https://n8n.bewe.co/webhook/11819e4e-810c-4d28-96b4-a94d08873fea", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tipo: "bienvenida",
              datos: { nombre, telefono },
            }),
          }).catch((err) => {
            console.error("Error enviando webhook de bienvenida", err);
          });
        }
      }
    },
    onSuccess: () => { toast.success("Empleado guardado"); qc.invalidateQueries({ queryKey: ["empleados"] }); },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });

  const deleteEmpleado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("empleados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Empleado eliminado"); qc.invalidateQueries({ queryKey: ["empleados"] }); },
    onError: (e: any) => {
      const code = e?.code ?? e?.cause?.code;
      const msg: string = e?.message ?? "";
      if (code === "23503" || msg.includes("foreign key") || msg.includes("violates foreign key constraint")) {
        toast.error("No se puede eliminar un empleado que tenga solicitudes");
      } else {
        toast.error(e?.message ?? "Error al eliminar");
      }
    },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Empleado> | null>(null);
  const [phone, setPhone] = useState<string>("");

  const startCreate = () => { setEditing(null); setPhone(""); setModalOpen(true); };
  const startEdit = (emp: Empleado) => { setEditing(emp); setPhone(emp.telefono); setModalOpen(true); };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Partial<Empleado> = {
      id: editing?.id,
      documento: Number(fd.get("documento")?.toString() ?? "0"),
      nombres: fd.get("nombres")?.toString() ?? "",
      apellidos: fd.get("apellidos")?.toString() ?? "",
      correo: fd.get("correo")?.toString() ?? "",
      telefono: phone,
      cumpleanos: fd.get("cumpleanos")?.toString() ?? null,
      dias_vacaciones: Number(fd.get("dias_vacaciones")?.toString() ?? "0"),
    };
    upsertEmpleado.mutate(payload);
    setModalOpen(false);
  };

  const headerTitle = useMemo(() => (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-semibold">Empleados</h1>
      <div className="flex items-center gap-2">
        <Button onClick={startCreate}><Plus className="mr-2 h-4 w-4" /> Nuevo</Button>
      </div>
    </div>
  ), []);

  return (
    <div className="min-h-screen notion-container pt-8">
      <div className="space-y-6">
        {headerTitle}

        <Card className="notion-card">
          <CardContent className="pt-6 space-y-6">
            {/* Filtros */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Nombres</Label>
                <Input value={filters.nombres} onChange={(e) => setFilters((f) => ({ ...f, nombres: e.target.value }))} placeholder="Filtrar..." />
              </div>
              <div className="space-y-2">
                <Label>Apellidos</Label>
                <Input value={filters.apellidos} onChange={(e) => setFilters((f) => ({ ...f, apellidos: e.target.value }))} placeholder="Filtrar..." />
              </div>
              <div className="space-y-2">
                <Label>Correo</Label>
                <Input value={filters.correo} onChange={(e) => setFilters((f) => ({ ...f, correo: e.target.value }))} placeholder="Filtrar..." />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={filters.telefono} onChange={(e) => setFilters((f) => ({ ...f, telefono: e.target.value }))} placeholder="Filtrar..." />
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Nombres</TableHead>
                    <TableHead>Apellidos</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={6}>Cargando...</TableCell></TableRow>
                  )}
                  {!isLoading && empleados.length === 0 && (
                    <TableRow><TableCell colSpan={6}>Sin resultados</TableCell></TableRow>
                  )}
                  {empleados.map((e) => (
                    <TableRow key={e.id} className="hover:bg-muted/40">
                      <TableCell>{e.documento}</TableCell>
                      <TableCell>{e.nombres}</TableCell>
                      <TableCell>{e.apellidos}</TableCell>
                      <TableCell>{e.correo}</TableCell>
                      <TableCell><PhoneDisplay value={e.telefono} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => startEdit(e)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteEmpleado.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Paginación */}
            <Pagination className="pt-2">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </CardContent>
        </Card>
      </div>

      {/* Modal Crear/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
            <DialogDescription>Completa la información del empleado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="documento">Documento</Label>
                <Input id="documento" name="documento" defaultValue={editing?.documento} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <PhoneInput value={phone} onChange={setPhone} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nombres">Nombres</Label>
                <Input id="nombres" name="nombres" type='text' defaultValue={editing?.nombres} required pattern="^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$" title="Solo letras y espacios" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="apellidos">Apellidos</Label>
                <Input id="apellidos" name="apellidos" type='text' defaultValue={editing?.apellidos} required pattern="^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$" title="Solo letras y espacios"/>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="correo">Correo</Label>
                <Input id="correo" name="correo" type="email" defaultValue={editing?.correo} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="correo">Cumpleaños</Label>
                <Input id="cumpleanos" name="cumpleanos" type="date" defaultValue={editing?.cumpleanos} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="correo">Vacaciones</Label>
                <Input id="dias_vacaciones" name="dias_vacaciones" type="number" defaultValue={editing?.dias_vacaciones} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" >Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
