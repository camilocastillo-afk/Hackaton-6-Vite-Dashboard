-- 1) Create public bucket for processed certificates (idempotent)
insert into storage.buckets (id, name, public)
values ('certificados', 'certificados', true)
on conflict (id) do nothing;

-- 2) Recreate policies safely
-- Public read
drop policy if exists "Certificados are publicly readable" on storage.objects;
create policy "Certificados are publicly readable"
on storage.objects
for select
using (bucket_id = 'certificados');

-- Authenticated upload
drop policy if exists "Authenticated users can upload certificados" on storage.objects;
create policy "Authenticated users can upload certificados"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'certificados');

-- 3) Update validation function: remove requirement for link when setting Procesada
create or replace function public.solicitudes_certificados_validate()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Always update fecha_edicion on updates
  if tg_op = 'UPDATE' then
    new.fecha_edicion := now();
  end if;

  -- Require motivo when setting Rechazada
  if new.estado_solicitud = 'Rechazada' and (new.motivo is null or btrim(new.motivo) = '') then
    raise exception 'El motivo es obligatorio cuando la solicitud es Rechazada';
  end if;

  -- NOTE: No longer require link when setting Procesada

  -- Prevent changing estado after it is final (Procesada o Rechazada)
  if tg_op = 'UPDATE' and (old.estado_solicitud in ('Procesada','Rechazada'))
     and (new.estado_solicitud is distinct from old.estado_solicitud) then
    raise exception 'No se puede cambiar el estado después de estar Procesada o Rechazada';
  end if;

  return new;
end;
$$;