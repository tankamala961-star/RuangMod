create table if not exists public.mods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  author text not null check (char_length(author) between 1 and 40),
  category text not null check (category in ('Visual', 'UI', 'Tools', 'Audio', 'Voice pack', 'Vehicle', 'Gameplay')),
  description text not null check (char_length(description) between 1 and 500),
  version text not null check (char_length(version) between 1 and 20),
  size_bytes bigint not null check (size_bytes between 1 and 104857600),
  sha256 text not null unique check (sha256 ~ '^[0-9a-f]{64}$'),
  archive_path text not null,
  preview_path text,
  created_at timestamptz not null default now(),
  constraint mods_archive_path_not_empty check (char_length(archive_path) > 0),
  constraint mods_preview_path_not_empty check (preview_path is null or char_length(preview_path) > 0)
);

create index if not exists mods_created_at_idx on public.mods (created_at desc);
alter table public.mods enable row level security;

grant select on public.mods to anon, authenticated;
grant insert, delete on public.mods to authenticated;

drop policy if exists "Anyone can read published mods" on public.mods;
create policy "Anyone can read published mods"
  on public.mods for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can publish their own mods" on public.mods;
create policy "Users can publish their own mods"
  on public.mods for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and archive_path like ((select auth.uid())::text || '/%')
    and (preview_path is null or preview_path like ((select auth.uid())::text || '/%'))
  );

drop policy if exists "Users can delete their own mod records" on public.mods;
create policy "Users can delete their own mod records"
  on public.mods for delete
  to authenticated
  using (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ruangmod-mods',
  'ruangmod-mods',
  true,
  104857600,
  array['application/zip', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read RuangMod files" on storage.objects;
create policy "Anyone can read RuangMod files"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'ruangmod-mods');

drop policy if exists "Users can upload to their own RuangMod folder" on storage.objects;
create policy "Users can upload to their own RuangMod folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'ruangmod-mods'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete files in their own RuangMod folder" on storage.objects;
create policy "Users can delete files in their own RuangMod folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'ruangmod-mods'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mods'
  ) then
    alter publication supabase_realtime add table public.mods;
  end if;
end
$$;

notify pgrst, 'reload schema';
