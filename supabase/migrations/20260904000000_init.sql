-- ============================================================
-- CampusHustle GrowthProof — Supabase setup (run once in the SQL editor)
-- Creates the shared campus "world", membership, RLS, and the
-- six demo auth accounts (password: password123).
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

-- ---------- demo auth accounts (password: password123) ----------
-- Add more rows to let other seeded profiles sign in, or create real
-- accounts through the app's sign-up (turn OFF email confirmation under
-- Authentication → Sign In / Providers → Email → Confirm email).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token
) values
('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated',
 'salawu@demo.campushustle.app', crypt('password123', gen_salt('bf')), now(),
 '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', ''),
('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated',
 'morayo@demo.campushustle.app', crypt('password123', gen_salt('bf')), now(),
 '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', ''),
('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000103', 'authenticated', 'authenticated',
 'tobi@demo.campushustle.app', crypt('password123', gen_salt('bf')), now(),
 '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', ''),
('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000104', 'authenticated', 'authenticated',
 'chiamaka@demo.campushustle.app', crypt('password123', gen_salt('bf')), now(),
 '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', ''),
('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000105', 'authenticated', 'authenticated',
 'admin@demo.campushustle.app', crypt('password123', gen_salt('bf')), now(),
 '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', ''),
('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000106', 'authenticated', 'authenticated',
 'super@demo.campushustle.app', crypt('password123', gen_salt('bf')), now(),
 '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '')
on conflict (email) do nothing;
