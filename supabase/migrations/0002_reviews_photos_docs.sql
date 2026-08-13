-- Adds: caregiver photos, reviews/testimonials, and admin-reviewed
-- verification documents (for the background-check flow), plus the two
-- storage buckets they need.
--
-- Note: is_admin() now lives in the `internal` schema (moved there in a
-- prior migration so PostgREST doesn't expose it as a public RPC endpoint),
-- with EXECUTE granted to anon/authenticated so RLS policies can still call
-- it. New policies below reference internal.is_admin(...) accordingly.

alter table public.caregiver_profiles add column photo_url text;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  family_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, caregiver_id)
);
create index reviews_caregiver_idx on public.reviews (caregiver_id, created_at desc);

alter table public.reviews enable row level security;
create policy reviews_select_all on public.reviews for select using (true);
create policy reviews_insert_own on public.reviews for insert with check (auth.uid() = family_id);
create policy reviews_update_own on public.reviews for update using (auth.uid() = family_id);
create policy reviews_delete_own on public.reviews for delete using (auth.uid() = family_id);

create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  uploaded_at timestamptz not null default now()
);
create index verification_documents_caregiver_idx on public.verification_documents (caregiver_id, uploaded_at desc);

alter table public.verification_documents enable row level security;
create policy verification_documents_insert_own on public.verification_documents
  for insert with check (auth.uid() = caregiver_id);
create policy verification_documents_select_own_or_admin on public.verification_documents
  for select using (auth.uid() = caregiver_id or internal.is_admin(auth.uid()));
create policy verification_documents_delete_own on public.verification_documents
  for delete using (auth.uid() = caregiver_id);

-- Storage: avatars (public read, so photos show in the directory) and
-- verification-docs (private -- only the owning caregiver and admins).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');
create policy avatars_owner_write on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_update on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_owner_delete on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy docs_owner_or_admin_read on storage.objects
  for select using (bucket_id = 'verification-docs' and ((storage.foldername(name))[1] = auth.uid()::text or internal.is_admin(auth.uid())));
create policy docs_owner_write on storage.objects
  for insert with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy docs_owner_delete on storage.objects
  for delete using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
