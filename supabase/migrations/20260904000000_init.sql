-- CampusHustle initial migration — matches schema.sql.
-- Creates the shared campus "world", membership, RLS, and realtime.
-- Demo auth accounts are provisioned via the Admin API
-- (scripts/create-demo-users.mjs), not raw auth.users inserts.
-- Idempotent: safe to apply over an existing database.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- shared campus world ----------
create table if not exists public.worlds (
  id uuid primary key,
  code text not null unique,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.world_members (
  id uuid primary key default gen_random_uuid(),
  auth_uid uuid not null unique references auth.users(id) on delete cascade,
  world_id uuid not null references public.worlds(id) on delete cascade,
  local_uid text not null default '',
  created_at timestamptz not null default now()
);

-- the one UNILAG demo world (id matches the app's WORLD_ID constant)
insert into public.worlds (id, code, state)
values ('00000000-0000-0000-0000-000000000001', 'unilag-demo', '{}'::jsonb)
on conflict (id) do nothing;

-- ---------- row level security ----------
alter table public.worlds enable row level security;
alter table public.world_members enable row level security;

drop policy if exists "member reads own world" on public.worlds;
create policy "member reads own world" on public.worlds
  for select using (
    exists (select 1 from public.world_members m where m.world_id = worlds.id and m.auth_uid = auth.uid())
  );

drop policy if exists "member updates own world" on public.worlds;
create policy "member updates own world" on public.worlds
  for update using (
    exists (select 1 from public.world_members m where m.world_id = worlds.id and m.auth_uid = auth.uid())
  ) with check (
    exists (select 1 from public.world_members m where m.world_id = worlds.id and m.auth_uid = auth.uid())
  );

drop policy if exists "anyone may create the demo world" on public.worlds;
create policy "anyone may create the demo world" on public.worlds
  for insert with check (id = '00000000-0000-0000-0000-000000000001'::uuid and code = 'unilag-demo');

drop policy if exists "member reads own membership" on public.world_members;
create policy "member reads own membership" on public.world_members
  for select using (auth_uid = auth.uid());

drop policy if exists "member joins own membership" on public.world_members;
create policy "member joins own membership" on public.world_members
  for insert with check (auth_uid = auth.uid());

-- ---------- realtime (cross-device live sync) ----------
do $$
begin
  alter publication supabase_realtime add table public.worlds;
exception
  when duplicate_object then null;
end $$;
