import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { CalendarIcon, Eye, Pencil, Download, BadgePlus } from "lucide-react";

import { format } from "date-fns";
import { get } from "http";
import { verifyAccessToken } from "@/components/googleTokenVerify";
import { DialogDescription } from "@radix-ui/react-dialog";


interface Solicitud {
  id: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  fecha_solicitud: string;
  ultima_modificacion: string;
  va_dirigida: boolean;
  nombre_destinatario: string;
  incluir_salario: boolean;
  incluir_extras: boolean;
  razon: string;
  incluir_funciones: boolean;
  estado: string;
  area: string;
  user_id: string;
}

interface Empleado { id: string; nombres: string; apellidos: string; telefono?: string; }

const PAGE_SIZE = 10;
const estados = ["En proceso", "Procesada", "Rechazada"] as const;

export default function Solicitudes() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<Solicitud | null>(null);
  const [newEstado, setNewEstado] = useState<string>("En proceso");
  const [motivo, setMotivo] = useState("");
  const [link, setLink] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [viewing, setViewing] = useState<any>(null);
  const [loadingView, setLoadingView] = useState(false);
  // Estado para el modal de archivo
  const [openArchivo, setOpenArchivo] = useState(false);
  const [solicitudArchivo, setSolicitudArchivo] = useState<Solicitud | null>(null);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useUserRoles();
  const qc = useQueryClient();
  const GOOGLE_CLIENT_ID = '288076817215-4252kpp15bp5fh96321dlanqk6vp35cu.apps.googleusercontent.com';
// Estado para modal de rechazo
const [openRechazo, setOpenRechazo] = useState(false);
const [rechazoMotivo, setRechazoMotivo] = useState("");
const [rechazoSolicitud, setRechazoSolicitud] = useState<Solicitud | null>(null);




  useEffect(() => {
    document.title = "RRHH Bewe — Gestión de solicitudes";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Filtra y administra solicitudes de certificados RRHH");
  }, []);

  const { data, isLoading } = useQuery<{ rows: Solicitud[]; count: number }>({
    queryKey: ["solicitudes", page, status, name, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("certificaciones_solicitudes")
        .select("*", { count: "exact" })
        .order("fecha_solicitud", { ascending: false });

      if (status) query = query.eq("estado", status);
      if (name.trim().length > 0) {
        query = query.or(`nombre.ilike.%${name}%,apellido.ilike.%${name}%`);
      }
      if (startDate) query = query.gte("fecha_solicitud", startDate.toISOString());
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23,59,59,999);
        query = query.lte("fecha_solicitud", end.toISOString());
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data: rows, count, error } = await query;
      if (error) throw error;
      return { rows: (rows || []) as Solicitud[], count: count || 0 };
    },
  });

  const onOpenEdit = (s: Solicitud) => {
    setEditing(s);
    setNewEstado(s.estado ?? "En proceso");
    setMotivo("");
    setLink("");
    setPdfFile(null);
    setOpenEdit(true);
  };

  const onOpenView = async (s: Solicitud) => {
    setViewing(null);
    setOpenView(true);
    setLoadingView(true);
    try {
      const { data, error } = await supabase
        .from("certificaciones_solicitudes")
        .select("*")
        .eq("id", s.id)
        .single();
      if (error) throw error;
      setViewing(data as any);
    } catch (e: any) {
      toast({ title: "Error al cargar detalle", description: e.message });
      setOpenView(false);
    } finally {
      setLoadingView(false);
    }
  };
  const saveEdit = async () => {
    if (!editing) return;
    // Puedes agregar validaciones específicas aquí si lo necesitas
    try {
      setUploading(true);
      const payload: Partial<Solicitud> = { estado: newEstado };
      // Puedes agregar más campos a payload si lo necesitas

      const { error } = await supabase
        .from("certificaciones_solicitudes")
        .update(payload)
        .eq("id", editing.id);
      if (error) {
        toast({ title: "Error al actualizar", description: error.message });
        return;
      }
      toast({ title: "Actualizado", description: "La solicitud fue actualizada" });
      setOpenEdit(false);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["solicitudes"] });
    } finally {
      setUploading(false);
    }
  };

  const rows = data?.rows || [];
  const count = data?.count || 0;
  const lastPage = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const resetFilters = () => {
    setStatus(undefined);
    setName("");
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(1);
  };

  // Abrir modal dedicado para archivo
  const openAddFile = (s: Solicitud) => {
    setSolicitudArchivo(s);
    setPdfFile(null);
    setLink("");
    setOpenArchivo(true);
  };

  // Función para subir archivo al Drive
  async function uploadFile(file: File, solicitud: Solicitud | null) {
    if (!file || !solicitud) return;
    try {
      const fecha = new Date(solicitud.fecha_solicitud)
      const nuevoArchivo = new File([file], `${solicitud.correo} | ${format(fecha, 'dd-MM-yyyy')}`, { type: file.type });

      const metadata = {
        name: `${solicitud.correo} | ${format(fecha, 'dd-MM-yyyy')}`,
        parents: ['1D3s5Z0jOd5oUD9WCXxgxbFKVfZ5-BQai']
      };

      const formData = new FormData();
      const metadataBlob = new Blob([JSON.stringify(metadata)], {
        type: 'application/json',
      });

      formData.append('metadata', metadataBlob);
      formData.append('file', nuevoArchivo);

      let accessToken: string | null = null;

      const googleToken = await verifyAccessToken(localStorage.getItem('google_token'));

      if (!googleToken){
        accessToken = await new Promise<string>((resolve, reject) => {
          //@ts-ignore
          google.accounts.oauth2.initTokenClient({
            client_id: '288076817215-4252kpp15bp5fh96321dlanqk6vp35cu.apps.googleusercontent.com',
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (response) => {
              if (response.access_token) {
                resolve(response.access_token);
              } else {
                reject('No token');
              }
            }
          }).requestAccessToken();
        });

        localStorage.setItem('google_token', accessToken);
      } 

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken ?? localStorage.getItem('google_token')}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Error al subir archivo');
      const data = await response.json();

      const modifyStatus = await supabase.from('certificaciones_solicitudes').update({ estado: 'Procesada' }).eq('id', solicitud.id);

      qc.invalidateQueries({ queryKey: ["solicitudes"] });

      toast({title: 'Hecho', description: "Archivo subido correctamente con ID: " + data.id});

      setOpenArchivo(false);
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e.message });
    }
  }

  const updateEstado = async (solicitud: Solicitud, estado: string) => {
    try {
      const { error } = await supabase
        .from("certificaciones_solicitudes")
        .update({ estado })
        .eq("id", solicitud.id);

      if (error) throw error;

      toast({ title: "Actualizado", description: `Nuevo estado: ${estado}` });
      qc.invalidateQueries({ queryKey: ["solicitudes"] });
    } catch (e: any) {
      toast({ title: "Error al actualizar", description: e.message });
    }
  };

  useEffect(() => {
    if (viewing && rechazoMotivo) {
      setViewing((prev) => prev ? { ...prev, razon: rechazoMotivo } : prev);
    }
  }, [rechazoMotivo]);

  return (
    <div className="mx-auto max-w-7xl p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Gestión de solicitudes</h1>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Estado</label>
            <Select value={status} onValueChange={(v) => { setStatus(v === "__ALL__" ? undefined : v); setPage(1); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="z-50">
                <SelectItem value="__ALL__">Todos</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="En proceso">En proceso</SelectItem>
                <SelectItem value="Procesada">Procesada</SelectItem>
                <SelectItem value="Rechazada">Rechazada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Nombre solicitante</label>
            <Input value={name} onChange={(e) => { setName(e.target.value); setPage(1); }} placeholder="Buscar por nombre" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Desde</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start", !startDate && "text-muted-foreground")}> 
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yyyy") : "Selecciona fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => { setStartDate(d ?? undefined); setPage(1); }}
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
                  {endDate ? format(endDate, "dd/MM/yyyy") : "Selecciona fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(d) => { setEndDate(d ?? undefined); setPage(1); }}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-end">
            <Button variant="secondary" onClick={resetFilters} className="w-full">Limpiar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Última edición</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const nombreCompleto = `${r.nombre} ${r.apellido}`;
                  const fecha = new Date(r.fecha_solicitud).toLocaleString("es-ES");
                  const modified = new Date(r.ultima_modificacion).toLocaleDateString("es-ES");
                  const finalizado = r.estado === "Procesada" || r.estado === "Rechazada";
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.id}</TableCell>
                      <TableCell>{fecha}</TableCell>
                      <TableCell>{modified.split('/')[2] !== "1969" ? modified : "-" }</TableCell>
                      <TableCell>{nombreCompleto}</TableCell>
                      <TableCell>
                        <div className="bg-transparent border-0 p-0 m-0">
                          <select
                            className="bg-transparent border-none p-1 text-sm text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-800 focus:outline-none"
                            value={r.estado ?? ""}
                            onChange={(e) => {
                              const selected = e.target.value;
                              if (selected === "Rechazada") {
                                setRechazoSolicitud(r);
                                setOpenRechazo(true);
                              } else {
                                setNewEstado(selected);
                              }
                            }}
                            disabled={r.estado === 'Procesada' || r.estado === 'Rechazada'}
                          >
                            {r.estado === undefined && (
                              <option value="" disabled>Selecciona un estado</option>
                            )}
                            {r.estado === 'Procesada' && (
                              <option value="Procesada" disabled>Procesada</option>
                            )}
                            <option value="En Progreso">En progreso</option>
                            <option value="Rechazada">Rechazada</option>
                          </select>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openAddFile(r)} aria-label="Ver detalle" disabled={r.estado === 'Procesada' || r.estado === 'Rechazada'} title={r.estado === 'Procesada' ? 'Esta solicitud ya fue procesada' : 'Agregar archivo'}>
                            <BadgePlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => onOpenView(r)} aria-label="Añadir Archivo">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Aquí puedes agregar lógica para editar si lo necesitas */}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {rows.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">Sin resultados</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Modal de detalle de solicitud */}
          <Dialog open={openView} onOpenChange={(o) => setOpenView(o)}>
            <DialogContent aria-describedby={undefined}>
              <DialogHeader>
                <DialogTitle>Detalle de la solicitud</DialogTitle>
              </DialogHeader>
              {loadingView ? (
                <div className="text-sm text-muted-foreground">Cargando...</div>
              ) : viewing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* ...existing code for detalle... */}
                  <div>
                    <div className="text-xs text-muted-foreground">Ticket</div>
                    <div className="font-medium">{viewing.id}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Solicitante</div>
                    <div className="font-medium">{viewing.nombre} {viewing.apellido}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Teléfono</div>
                    <div className="font-medium">{viewing.telefono}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Estado</div>
                    <div className="font-medium"> 
                      {isAdmin ? (
                        <select
                          className="bg-transparent border-none p-1 text-sm text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-800 focus:outline-none"
                          value={viewing.estado ?? ""}
                          onChange={(e) => {
                            const selected = e.target.value;
                            if (selected === "Rechazada") {
                              setRechazoSolicitud(viewing); 
                              setOpenRechazo(true);
                            } else {
                              updateEstado(viewing, selected);
                              setViewing((prev) => prev ? { ...prev, estado: selected } : prev); 
                            }
                          }}
                        >
                          {viewing.estado === undefined && (
                            <option value="" disabled>Selecciona un estado</option>
                          )}
                          <option value="Procesada">Procesada</option>
                          <option value="En Progreso">En progreso</option>
                          <option value="Rechazada">Rechazada</option>
                        </select>
                    ) : (
                      viewing.estado ?? "En Proceso"
                    )}
                  </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Fecha creación</div>
                    <div className="font-medium">{new Date(viewing.fecha_solicitud).toLocaleString("es-ES")}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Última edición</div>
                    <div className="font-medium">{viewing.ultima_modificacion ? new Date(viewing.ultima_modificacion).toLocaleString("es-ES") : "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Va dirigida</div>
                    <div className="font-medium">{viewing.va_dirigida ? "Sí" : "No"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Destinatario</div>
                    <div className="font-medium">{viewing.nombre_destinatario ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Incluir salario</div>
                    <div className="font-medium">{viewing.incluir_salario ? "Sí" : "No"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Incluir extras</div>
                    <div className="font-medium">{viewing.incluir_extras ? "Sí" : "No"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Incluir funciones</div>
                    <div className="font-medium">{viewing.incluir_funciones ? "Sí" : "No"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Area</div>
                    <div className="font-medium">{viewing.area || "-"}</div>
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs text-muted-foreground">Motivo</div>
                    <div className="font-medium break-words">{viewing.razon || "-"}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No se encontró la solicitud.</div>
              )}
            </DialogContent>
          </Dialog>

          {/* Modal dedicado para carga de archivo */}
          <Dialog open={openArchivo} onOpenChange={setOpenArchivo}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {solicitudArchivo ? `Cargar archivo para ${solicitudArchivo.nombre} ${solicitudArchivo.apellido}` : "Cargar archivo"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <>
                  {!isGoogleAuth && <div className="text-xs text-yellow-600 mb-2">⚠️ Se pedirá autorización de Google Drive</div>}
                  <Input type="file" accept="application/pdf"onChange={(e) => {
                    const file = e.target.files?.[0] || null;

                    if (file) {
                      const isPDF =
                        file.type === "application/pdf" ||
                        file.name.toLowerCase().endsWith(".pdf");

                      if (!isPDF) {
                        toast({
                          title: "Archivo inválido",
                          description: "Solo se permiten archivos PDF.",
                          variant: "destructive",
                        });
                        setPdfFile(null);
                        return;
                      }

                      setPdfFile(file);
                    } else {
                      setPdfFile(null);
                    }
                  }} 
                  />
                </>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setOpenArchivo(false)}>Cancelar</Button>
                <Button disabled={!pdfFile || uploading} onClick={async () => {
                  setUploading(true);
                  await uploadFile(pdfFile!, solicitudArchivo);
                  setUploading(false);
                }}>Subir</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de rechazo */}
          <Dialog open={openRechazo} onOpenChange={setOpenRechazo}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rechazar solicitud</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Estás rechazando la solicitud de <strong>{rechazoSolicitud?.nombre} {rechazoSolicitud?.apellido}</strong>. Por favor, indica el motivo del rechazo:
                </p>
                <textarea
                  className="w-full border rounded p-2 text-sm"
                  rows={4}
                  value={rechazoMotivo}
                  onChange={(e) => setRechazoMotivo(e.target.value)}
                  placeholder="Escribe el motivo aquí..."
                />
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setOpenRechazo(false)}>Cancelar</Button>
                <Button
                  disabled={!rechazoMotivo.trim()}
                  onClick={async () => {
                    if (!rechazoSolicitud) return;
                    const { error } = await supabase
                      .from("certificaciones_solicitudes")
                      .update({ estado: "Rechazada", razon: rechazoMotivo.trim() })
                      .eq("id", rechazoSolicitud.id);

                    setViewing((prev) => prev ? { ...prev, estado: "Rechazada" } : prev); 
                    if (error) {
                      toast({ title: "Error al rechazar", description: error.message });
                    } else {
                      toast({ title: "Solicitud rechazada" });
                      setOpenRechazo(false);
                      setRechazoMotivo("");
                      setRechazoSolicitud(null);
                      qc.invalidateQueries({ queryKey: ["solicitudes"] });
                    }
                  }}
                >
                  Confirmar rechazo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

              
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); }} />
                </PaginationItem>
                <span className="px-2 text-sm text-muted-foreground">Página {page} de {lastPage}</span>
                <PaginationItem>
                  <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(lastPage, p + 1)); }} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
