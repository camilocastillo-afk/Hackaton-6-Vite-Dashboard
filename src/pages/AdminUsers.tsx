import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit2 } from "lucide-react";
import type { AppRole } from "@/hooks/useUserRoles";

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

interface UserWithRoles extends ProfileRow {
  roles: AppRole[];
}

export default function AdminUsers() {
  useEffect(() => {
    document.title = "Administración — RRHH Bewe";
  }, []);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Crear usuario (modal)
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [rolesNew, setRolesNew] = useState<{ admin: boolean; hr: boolean }>({ admin: false, hr: true });
  const [creating, setCreating] = useState(false);

  // Editar roles (modal)
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserWithRoles | null>(null);
  const [editRoles, setEditRoles] = useState<{ admin: boolean; hr: boolean }>({ admin: false, hr: true });
  const [savingEdit, setSavingEdit] = useState(false);

  // Server fetch with pagination
  const fetchUsers = async (): Promise<{ list: UserWithRoles[]; count: number }> => {
    let query = supabase
      .from("profiles")
      .select("id,email,display_name,created_at", { count: "exact" })
      .order("created_at", { ascending: false });

    const q = search.trim();
    if (q) {
      // search on email OR display_name
      query = query.or(`email.ilike.%${q}%,display_name.ilike.%${q}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data: profiles, error, count } = await query.range(from, to);
    if (error) throw error;

    const ids = (profiles ?? []).map((p: any) => p.id);
    let rolesByUser = new Map<string, AppRole[]>();
    if (ids.length) {
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id,role")
        .in("user_id", ids);
      if (rErr) throw rErr;
      (roles || []).forEach((r: any) => {
        const arr = rolesByUser.get(r.user_id) ?? [];
        if (!arr.includes(r.role)) arr.push(r.role as AppRole);
        rolesByUser.set(r.user_id, arr);
      });
    }

    const list: UserWithRoles[] = (profiles || []).map((p: any) => ({
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      created_at: p.created_at,
      roles: rolesByUser.get(p.id) ?? [],
    }));

    return { list, count: count ?? 0 };
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-users", search, page, pageSize],
    queryFn: fetchUsers,
  });

  const users = data?.list ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Crear usuario
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedRoles = [rolesNew.admin && "admin", rolesNew.hr && "hr"].filter(Boolean) as string[];
    if (!email || !password || selectedRoles.length === 0) {
      return toast.error("Completa email, contraseña y al menos un rol");
    }
    setCreating(true);
    try {
      const { error } = await supabase.functions.invoke("admin-create-user", {
        body: { email, password, display_name: displayName || null, roles: selectedRoles },
      });
      if (error) throw error;
      toast.success("Usuario creado correctamente");
      setCreateOpen(false);
      setEmail("");
      setPassword("");
      setDisplayName("");
      setRolesNew({ admin: false, hr: true });
      await refetch();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "No se pudo crear el usuario");
    } finally {
      setCreating(false);
    }
  };

  // Edit roles helpers
  const openEdit = (u: UserWithRoles) => {
    setEditUser(u);
    setEditRoles({ admin: u.roles.includes("admin"), hr: u.roles.includes("hr") });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSavingEdit(true);
    try {
      const current = editUser.roles;
      const next = [editRoles.admin && "admin", editRoles.hr && "hr"].filter(Boolean) as AppRole[];

      const toAdd = next.filter((r) => !current.includes(r));
      const toRemove = current.filter((r) => !next.includes(r));

      if (toAdd.length) {
        const rows = toAdd.map((role) => ({ user_id: editUser.id, role }));
        const { error } = await supabase.from("user_roles").insert(rows);
        if (error && (error as any).code !== "23505") throw error;
      }
      if (toRemove.length) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", editUser.id)
          .in("role", toRemove);
        if (error) throw error;
      }

      toast.success("Roles actualizados");
      setEditOpen(false);
      setEditUser(null);
      await refetch();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "No se pudieron actualizar los roles");
    } finally {
      setSavingEdit(false);
    }
  };

  // Header content similar to Employees
  const header = useMemo(() => (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-semibold">Administración de usuarios</h1>
      <Button onClick={() => setCreateOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Crear usuario
      </Button>
    </div>
  ), []);

  return (
    <div className="min-h-screen notion-container py-8">
      <div className="space-y-6">
        {header}

        <Card className="notion-card">
          <CardContent className="pt-6 space-y-6">
            {/* Filtros */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label>Buscar</Label>
                <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Nombre o correo" />
              </div>
              <div className="flex items-end">
                <Button variant="secondary" className="w-full" onClick={() => refetch()}>Refrescar</Button>
              </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead className="text-right w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={4}>Cargando...</TableCell></TableRow>
                  )}
                  {!isLoading && users.length === 0 && (
                    <TableRow><TableCell colSpan={4}>Sin resultados</TableCell></TableRow>
                  )}
                  {users.map((u) => (
                    <TableRow key={u.id} className="hover:bg-muted/40">
                      <TableCell>{u.display_name || "—"}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.roles.length ? u.roles.join(", ") : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(u)} aria-label="Editar roles">
                          <Edit2 className="h-4 w-4" />
                        </Button>
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
      </div>

      {/* Modal Crear Usuario */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear usuario</DialogTitle>
            <DialogDescription>Dar de alta una cuenta y asignar roles.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="display_name">Nombre para mostrar (opcional)</Label>
                <Input id="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="font-medium">Roles</div>
                <label className="flex items-center gap-2">
                  <Checkbox checked={rolesNew.hr} onCheckedChange={() => setRolesNew((r) => ({ ...r, hr: !r.hr }))} />
                  <span>Recursos Humanos</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={rolesNew.admin} onCheckedChange={() => setRolesNew((r) => ({ ...r, admin: !r.admin }))} />
                  <span>Administrador</span>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={creating}>{creating ? "Creando..." : "Crear usuario"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Roles */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar roles</DialogTitle>
            <DialogDescription>Selecciona los roles para este usuario</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <div className="font-medium">Usuario</div>
              <div className="text-sm text-muted-foreground">{editUser?.email}</div>
            </div>
            <div className="grid gap-3">
              <label className="flex items-center gap-2">
                <Checkbox checked={editRoles.hr} onCheckedChange={() => setEditRoles((s) => ({ ...s, hr: !s.hr }))} />
                <span>Recursos Humanos</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={editRoles.admin} onCheckedChange={() => setEditRoles((s) => ({ ...s, admin: !s.admin }))} />
                <span>Administrador</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>{savingEdit ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
