import React, { useState, useMemo } from "react";
import { Edit2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { set } from "date-fns";

interface areasRow {
    id: string;
    nombre: string;
}

export default function AdminAreas() {

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const pageSize = 7;

    const [editOpen, setEditOpen] = useState(false);
    const [selected, setSelected] = useState<areasRow | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [areaName, setAreaName] = useState("");

    const { data, isLoading, error, refetch } = useQuery({
     queryKey: ["admin-areas"],
        queryFn: async (): Promise<areasRow[]> => {

        const { data, error } = await supabase
            .from("areas")
            .select(`*`);
    
      if (error) throw error;

      const normalized = (data as any[]).map((row) => ({
        id: row.id,
        nombre: row.nombre
      })) as areasRow[];
      return normalized;
    },
  });


    const filtered = useMemo(() => {
        const list = (data ?? []) as areasRow[];
        const q = search.trim().toLowerCase();
        if (!q) return list;
        return list.filter((row) => {
        const haystack = [
            row.id ?? "",
            row.nombre ?? ""
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

    const updateArea = async () => {
        if (!selected || !areaName) return;
        setSaving(true);
        const { error } = await supabase
            .from("areas")
            .update({ nombre: areaName })
            .eq("id", selected.id);

        if (error) toast.error("Error al actualizar el área");

        toast.success("Área actualizada");
        await refetch();
        setEditOpen(false);
        setAreaName("");
        setSaving(false);
    }

    const createArea = async () => {
        if (!areaName) return;
        setSaving(true);
        const { data, error } = await supabase
            .from("areas")
            .insert({ nombre: areaName })
            .select("id")
            .single();


        if (error) {
            toast.error("Error al crear el área");
            setSaving(false);
            return;
        }

        const { error: jeferror } = await supabase
            .from("jefes")
            .insert({ area_id: data.id, empleado_id: null })

        if (jeferror) toast.error("Error al crear el área");

        toast.success("Área creada");
        await refetch();
        setCreateOpen(false);
        setAreaName("");
        setSaving(false);
    }  
    
    const deleteArea = async () => {
        if (!selected) return;  
        setSaving(true);

        const { error } = await supabase
            .from("areas")
            .delete()
            .eq("id", selected.id);
        if (error) toast.error("Error al eliminar el área");

        const { error: jeferror } = await supabase
            .from("jefes")
            .delete()
            .eq("area_id", selected.id);
        if (error) toast.error("Error al eliminar el área");

        toast.success("Área eliminada");
        await refetch();
        setEditOpen(false);
        setSaving(false);
    }
    
    const header = useMemo(() => (
    <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Administración de Áreas</h2>
    </div>
    ), []);

    return(
        <div>
            <Card className="notion-card">
                <CardContent className="pt-6 space-y-6">
                {header}

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                    <Label>Buscar</Label>
                    <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Nombre, correo o documento" />
                    </div>
                    <div className="flex items-end gap-4">
                        <Button variant="secondary" className="w-full" onClick={() => refetch()}>Refrescar</Button>
                        <Button onClick={() => setCreateOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Crear Área
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>ID</TableHead>
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
                        <TableRow key={row.id ?? `area-${i}`} className="hover:bg-muted/40">
                            <TableCell>{row.nombre ?? "—"}</TableCell>
                            <TableCell>{row.id ?? "—"}</TableCell>
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

            {/* Editar un área*/}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar jefe</DialogTitle>
                    <DialogDescription>Selecciona el nuevo jefe para el área.</DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await updateArea(); }}>
                    <div className="grid gap-3">
                        <div className="space-y-2">
                            <Label>Área</Label>
                            <Input value={selected?.id ?? ""} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input 
                                placeholder = {selected?.nombre ?? "Nombre del área"}
                                value={areaName} 
                                onChange={(e) => setAreaName(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <div className="flex-grow">
                            <Button type='button' variant='destructive' onClick={deleteArea}>Eliminar</Button>
                        </div>
                        <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={saving || !areaName}>Guardar</Button>
                    </DialogFooter>
                </form>
                </DialogContent>
            </Dialog>

            {/* Crear un área*/}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear área</DialogTitle>
                        <DialogDescription>Ingresa el nombre del área.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <input
                            className="bg-white dark:bg-black w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="Nombre del área"
                            value={areaName}
                            onChange={(e) => setAreaName(e.target.value)}
                        /> 
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={saving || !areaName} onClick={createArea}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );  
}