-- Create public bucket for processed certificates
insert into storage.buckets (id, name, public)
values ('certificados', 'certificados', true)
on conflict (id) do nothing;

-- Allow public read access to objects in the certificados bucket
create policy if not exists "Certificados are publicly readable"
on storage.objects
for select
using (bucket_id = 'certificados');

-- Allow authenticated users to upload into the certificados bucket
create policy if not exists "Authenticated users can upload certificados"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'certificados');