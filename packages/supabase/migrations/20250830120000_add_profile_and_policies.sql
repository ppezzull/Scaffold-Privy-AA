-- Add profile fields to users
alter table if exists public.users
  add column if not exists name text,
  add column if not exists surname text;

-- Ensure RLS is enabled (already enabled in init, but keep it idempotent)
alter table public.users enable row level security;

-- Column-level privileges: restrict sensitive columns, allow public to read only safe columns
-- Revoke broad privileges first
revoke all on table public.users from anon;
revoke all on table public.users from authenticated;

-- Allow public (anon) to read only non-sensitive columns
grant select (id, name, surname, created_at) on public.users to anon;

-- Allow authenticated to read the same public columns
grant select (id, name, surname, created_at) on public.users to authenticated;

-- Allow authenticated users to update their own name/surname (enforced by RLS below)
grant update (name, surname) on public.users to authenticated;

-- Optionally allow insert/delete on own row (enforced by RLS)
grant insert (id, name, surname) on public.users to authenticated;
grant delete on public.users to authenticated;

-- RLS Policies
-- 1) Public can select any row (column-level grants limit what they see)
drop policy if exists users_public_select on public.users;
create policy users_public_select on public.users
  for select using (true);

-- 2) Authenticated users can insert a row only for themselves (id must match JWT sub)
drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert
  with check (auth.uid() = id);

-- 3) Authenticated users can select their own row (useful if you later restrict public select)
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select using (auth.uid() = id);

-- 4) Authenticated users can update only their own row
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 5) Authenticated users can delete only their own row
drop policy if exists users_delete_own on public.users;
create policy users_delete_own on public.users
  for delete using (auth.uid() = id);
