-- Storage policies - Ayrı çalıştır (bucket zaten varsa)

-- Public okuma erişimi
drop policy if exists "Public Read Access" on storage.objects;
create policy "Public Read Access"
on storage.objects for select
using (bucket_id = 'profile-photos');

-- Authenticated kullanıcılar upload yapabilir
drop policy if exists "Authenticated Upload" on storage.objects;
create policy "Authenticated Upload"
on storage.objects for insert
with check (
  bucket_id = 'profile-photos' 
  and auth.role() = 'authenticated'
);

-- Kendi dosyalarını güncelleyebilir
drop policy if exists "Owner Update" on storage.objects;
create policy "Owner Update"
on storage.objects for update
using (
  bucket_id = 'profile-photos' 
  and auth.uid()::text = (storage.foldername(name))[1]
);
