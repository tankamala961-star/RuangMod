create table if not exists public.mods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  author text not null check (char_length(author) between 1 and 40),
  category text not null check (category in ('UI', 'Gameplay', 'Vehicles', 'Voice pack', 'Tools', 'Audio', 'Visual')),
  description text not null check (char_length(description) between 1 and 500),
  version text not null check (char_length(version) between 1 and 20),
  size_bytes bigint not null check (size_bytes between 1 and 5368709120),
  sha256 text not null unique check (sha256 ~ '^[0-9a-f]{64}$'),
  archive_path text not null,
  preview_path text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  constraint mods_archive_path_not_empty check (char_length(archive_path) > 0),
  constraint mods_preview_path_not_empty check (preview_path is null or char_length(preview_path) > 0),
  constraint mods_archive_path_matches_mod check (
    archive_path = user_id::text || '/' || id::text || '.zip'
  ),
  constraint mods_preview_path_matches_mod check (
    preview_path is null
    or preview_path ~ ('^' || user_id::text || '/' || id::text || '-preview\.(png|jpg|jpeg|webp)$')
  ),
  constraint mods_text_fields_not_blank check (
    name ~ '[^[:space:]]'
    and author ~ '[^[:space:]]'
    and description ~ '[^[:space:]]'
    and version ~ '[^[:space:]]'
  )
);

alter table public.mods drop constraint if exists mods_size_bytes_check;
alter table public.mods
  add constraint mods_size_bytes_check
  check (size_bytes between 1 and 5368709120);

alter table public.mods drop constraint if exists mods_category_check;
update public.mods set category = 'Vehicles' where category = 'Vehicle';
alter table public.mods
  add constraint mods_category_check
  check (category in ('UI', 'Gameplay', 'Vehicles', 'Voice pack', 'Tools', 'Audio', 'Visual'));
alter table public.mods
  add column if not exists is_published boolean not null default true;

update public.mods
set is_published = false
where id = '3409d63e-c101-4ce2-b3b0-e1c9176bfd13'::uuid;

update public.mods
set is_published = false
where category = 'Vehicles'
  and lower(btrim(name)) = 'mod benson'
  and is_published;

create table if not exists public.mod_category_counts (
  category text primary key check (category in ('UI', 'Gameplay', 'Vehicles', 'Voice pack', 'Tools', 'Audio', 'Visual')),
  mod_count bigint not null check (mod_count >= 0),
  analyzed_at timestamptz not null
);

alter table public.mod_category_counts enable row level security;
grant select on public.mod_category_counts to anon, authenticated;
revoke insert, update, delete on public.mod_category_counts from anon, authenticated;

drop policy if exists "Anyone can read mod category counts" on public.mod_category_counts;
create policy "Anyone can read mod category counts"
  on public.mod_category_counts for select
  to anon, authenticated
  using (true);

create or replace function public.refresh_mod_category_counts()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.mod_category_counts (category, mod_count, analyzed_at)
  select categories.category, count(mods.id), now()
  from unnest(array['UI', 'Gameplay', 'Vehicles', 'Voice pack', 'Tools', 'Audio', 'Visual']::text[])
    as categories(category)
  left join public.mods as mods
    on mods.category = categories.category
    and mods.is_published
  group by categories.category
  on conflict (category) do update
    set mod_count = excluded.mod_count,
        analyzed_at = excluded.analyzed_at;
$$;

revoke all on function public.refresh_mod_category_counts() from public, anon, authenticated;

create or replace function public.refresh_mod_category_count(p_category text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.mod_category_counts (category, mod_count, analyzed_at)
  select p_category, count(mods.id), now()
  from public.mods as mods
  where mods.category = p_category
    and mods.is_published
  on conflict (category) do update
    set mod_count = excluded.mod_count,
        analyzed_at = excluded.analyzed_at;
$$;

revoke all on function public.refresh_mod_category_count(text) from public, anon, authenticated;

create or replace function public.update_mod_category_counts_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_category text;
begin
  if tg_op = 'INSERT' then
    if new.is_published then
      perform public.refresh_mod_category_count(new.category);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.is_published then
      perform public.refresh_mod_category_count(old.category);
    end if;
    return old;
  end if;

  for affected_category in
    select distinct changed.category
    from (values
      (case when old.is_published then old.category end),
      (case when new.is_published then new.category end)
    ) as changed(category)
    where changed.category is not null
  loop
    perform public.refresh_mod_category_count(affected_category);
  end loop;

  return new;
end
$$;

revoke all on function public.update_mod_category_counts_after_change() from public, anon, authenticated;

drop trigger if exists refresh_mod_category_counts_after_change on public.mods;
create trigger refresh_mod_category_counts_after_change
  after insert or update or delete on public.mods
  for each row
  execute function public.update_mod_category_counts_after_change();

select public.refresh_mod_category_counts();

create extension if not exists pg_cron;
select cron.unschedule(jobid)
from cron.job
where jobname = 'refresh-mod-category-counts';
select cron.schedule(
  'refresh-mod-category-counts',
  '*/30 * * * *',
  'select public.refresh_mod_category_counts();'
);

create index if not exists mods_created_at_idx on public.mods (created_at desc);
create index if not exists mods_catalog_order_idx on public.mods (created_at desc, id asc);
create unique index if not exists mods_archive_path_uidx on public.mods (archive_path);
create unique index if not exists mods_preview_path_uidx on public.mods (preview_path)
  where preview_path is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mods'::regclass
      and conname = 'mods_archive_path_matches_mod'
  ) then
    alter table public.mods
      add constraint mods_archive_path_matches_mod
      check (archive_path = user_id::text || '/' || id::text || '.zip');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mods'::regclass
      and conname = 'mods_preview_path_matches_mod'
  ) then
    alter table public.mods
      add constraint mods_preview_path_matches_mod
      check (
        preview_path is null
        or preview_path ~ ('^' || user_id::text || '/' || id::text || '-preview\.(png|jpg|jpeg|webp)$')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mods'::regclass
      and conname = 'mods_text_fields_not_blank'
  ) then
    alter table public.mods
      add constraint mods_text_fields_not_blank
      check (
        name ~ '[^[:space:]]'
        and author ~ '[^[:space:]]'
        and description ~ '[^[:space:]]'
        and version ~ '[^[:space:]]'
      );
  end if;
end
$$;

alter table public.mods enable row level security;

grant select on public.mods to anon, authenticated;
grant insert on public.mods to authenticated;
revoke delete on public.mods from authenticated;

drop policy if exists "Anyone can read published mods" on public.mods;
create policy "Anyone can read published mods"
  on public.mods for select
  to anon, authenticated
  using (is_published);

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ruangmod-mods',
  'ruangmod-mods',
  false,
  5368709120,
  array['application/zip', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read RuangMod files" on storage.objects;
drop policy if exists "Anyone can read RuangMod previews" on storage.objects;
create policy "Anyone can read RuangMod previews"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'ruangmod-mods'
    and name ~ '-preview\.(png|jpg|jpeg|webp)$'
  );

drop policy if exists "Google users can read RuangMod archives" on storage.objects;
create policy "Google users can read RuangMod archives"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'ruangmod-mods'
    and name ~ '\.zip$'
    and (select auth.jwt() -> 'app_metadata' ->> 'provider') = 'google'
    and exists (
      select 1
      from public.mods
      where public.mods.archive_path = storage.objects.name
        and public.mods.is_published
    )
  );

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
