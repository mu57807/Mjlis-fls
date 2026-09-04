-- ============================================================
-- Majlis FLS — Supabase schema
-- Run this once in your project's SQL Editor (Supabase Dashboard
-- → SQL Editor → New query → paste → Run).
-- Safe to re-run: every statement is idempotent.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------

create table if not exists invite_codes (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  company text not null,
  site text not null,
  role text not null default 'member' check (role in ('member', 'admin')),
  max_uses integer not null default 1,
  use_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  job_title text not null,
  company text not null,
  site text not null,
  is_admin boolean not null default false,
  invite_code_id uuid references invite_codes(id),
  created_at timestamptz not null default now()
);

create table if not exists themes (
  id uuid primary key default uuid_generate_v4(),
  quarter_label text not null,
  title_en text not null,
  title_ar text not null,
  prompt_en text not null,
  prompt_ar text not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

-- Only one theme may be current at a time.
create unique index if not exists themes_one_current
  on themes ((is_current)) where is_current;

create table if not exists leadership_message (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  title_en text not null,
  title_ar text not null,
  caption_en text not null,
  caption_ar text not null,
  video_url text not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists leadership_one_current
  on leadership_message ((is_current)) where is_current;

create table if not exists learning_materials (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('video', 'doc')),
  title_en text not null,
  title_ar text not null,
  file_url text not null,
  meta text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  theme_id uuid not null references themes(id),
  video_url text not null,
  caption text,
  duration_seconds integer,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table invite_codes enable row level security;
alter table profiles enable row level security;
alter table themes enable row level security;
alter table leadership_message enable row level security;
alter table learning_materials enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table likes enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false);
$$;

-- profiles: every signed-in user can read all profiles (so posts/comments
-- can show name + company + site). No direct client-side writes — profile
-- rows are only ever created/edited through the RPC functions below.
drop policy if exists "profiles_select_authenticated" on profiles;
create policy "profiles_select_authenticated" on profiles
  for select using (auth.role() = 'authenticated');

-- invite_codes: admins only. Signup validates codes through the
-- validate_invite_code() RPC instead of querying this table directly.
drop policy if exists "invite_codes_admin_all" on invite_codes;
create policy "invite_codes_admin_all" on invite_codes
  for all using (is_admin()) with check (is_admin());

-- themes: everyone signed in can read; only admins write.
drop policy if exists "themes_select_authenticated" on themes;
create policy "themes_select_authenticated" on themes
  for select using (auth.role() = 'authenticated');
drop policy if exists "themes_admin_write" on themes;
create policy "themes_admin_write" on themes
  for all using (is_admin()) with check (is_admin());

drop policy if exists "leadership_select_authenticated" on leadership_message;
create policy "leadership_select_authenticated" on leadership_message
  for select using (auth.role() = 'authenticated');
drop policy if exists "leadership_admin_write" on leadership_message;
create policy "leadership_admin_write" on leadership_message
  for all using (is_admin()) with check (is_admin());

drop policy if exists "materials_select_authenticated" on learning_materials;
create policy "materials_select_authenticated" on learning_materials
  for select using (auth.role() = 'authenticated');
drop policy if exists "materials_admin_write" on learning_materials;
create policy "materials_admin_write" on learning_materials
  for all using (is_admin()) with check (is_admin());

-- posts: everyone sees visible posts; admins see everything (incl. hidden).
-- Any signed-in user may create their own post. Only admins may update
-- (hide/unhide) or delete.
drop policy if exists "posts_select_visible" on posts;
create policy "posts_select_visible" on posts
  for select using (not is_hidden or is_admin());
drop policy if exists "posts_insert_own" on posts;
create policy "posts_insert_own" on posts
  for insert with check (auth.uid() = user_id);
drop policy if exists "posts_admin_update" on posts;
create policy "posts_admin_update" on posts
  for update using (is_admin()) with check (is_admin());
drop policy if exists "posts_admin_delete" on posts;
create policy "posts_admin_delete" on posts
  for delete using (is_admin());

-- comments: readable by all signed-in users; anyone may add their own;
-- admins may delete any comment (moderation).
drop policy if exists "comments_select_authenticated" on comments;
create policy "comments_select_authenticated" on comments
  for select using (auth.role() = 'authenticated');
drop policy if exists "comments_insert_own" on comments;
create policy "comments_insert_own" on comments
  for insert with check (auth.uid() = user_id);
drop policy if exists "comments_admin_delete" on comments;
create policy "comments_admin_delete" on comments
  for delete using (is_admin() or auth.uid() = user_id);

-- likes: readable by all; users can like/unlike only as themselves.
drop policy if exists "likes_select_authenticated" on likes;
create policy "likes_select_authenticated" on likes
  for select using (auth.role() = 'authenticated');
drop policy if exists "likes_insert_own" on likes;
create policy "likes_insert_own" on likes
  for insert with check (auth.uid() = user_id);
drop policy if exists "likes_delete_own" on likes;
create policy "likes_delete_own" on likes
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- RPC FUNCTIONS
-- ------------------------------------------------------------

-- Preview an invite code before signup (no table SELECT grant needed).
create or replace function validate_invite_code(p_code text)
returns table (valid boolean, company text, site text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row invite_codes%rowtype;
begin
  select * into v_row from invite_codes
    where code = p_code and is_active and use_count < max_uses;
  if v_row.id is null then
    return query select false, null::text, null::text, null::text;
  else
    return query select true, v_row.company, v_row.site, v_row.role;
  end if;
end;
$$;

-- Called right after a magic-link signup completes (auth.uid() is set).
-- Creates the caller's profile from the invite code and consumes one use.
-- Idempotent: if the caller already has a profile, just returns it.
create or replace function redeem_invite_code(p_code text, p_name text, p_job_title text)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row invite_codes%rowtype;
  v_profile profiles%rowtype;
begin
  select * into v_profile from profiles where id = auth.uid();
  if found then
    return v_profile;
  end if;

  select * into v_row from invite_codes
    where code = p_code and is_active and use_count < max_uses
    for update;

  if v_row.id is null then
    raise exception 'Invalid or expired invite code';
  end if;

  update invite_codes set use_count = use_count + 1 where id = v_row.id;

  insert into profiles (id, name, job_title, company, site, is_admin, invite_code_id)
    values (auth.uid(), p_name, p_job_title, v_row.company, v_row.site,
            v_row.role = 'admin', v_row.id)
    returning * into v_profile;

  return v_profile;
end;
$$;

-- Admin: mint a new invite code. Generates a readable random code if none given.
create or replace function create_invite_code(
  p_company text, p_site text, p_role text default 'member', p_max_uses integer default 1
)
returns invite_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_row invite_codes%rowtype;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;
  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
  insert into invite_codes (code, company, site, role, max_uses, created_by)
    values (v_code, p_company, p_site, p_role, p_max_uses, auth.uid())
    returning * into v_row;
  return v_row;
end;
$$;

grant execute on function validate_invite_code(text) to anon, authenticated;
grant execute on function redeem_invite_code(text, text, text) to authenticated;
grant execute on function create_invite_code(text, text, text, integer) to authenticated;

-- ------------------------------------------------------------
-- STORAGE BUCKETS + POLICIES
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('videos', 'videos', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('materials', 'materials', true)
  on conflict (id) do nothing;

drop policy if exists "videos_public_read" on storage.objects;
create policy "videos_public_read" on storage.objects
  for select using (bucket_id = 'videos');

-- Users may only upload into a folder named after their own user id,
-- e.g. videos/<uid>/<timestamp>.webm
drop policy if exists "videos_owner_insert" on storage.objects;
create policy "videos_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'videos' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "materials_public_read" on storage.objects;
create policy "materials_public_read" on storage.objects
  for select using (bucket_id = 'materials');

drop policy if exists "materials_admin_write" on storage.objects;
create policy "materials_admin_write" on storage.objects
  for insert with check (bucket_id = 'materials' and is_admin());
drop policy if exists "materials_admin_update" on storage.objects;
create policy "materials_admin_update" on storage.objects
  for update using (bucket_id = 'materials' and is_admin());
drop policy if exists "materials_admin_delete" on storage.objects;
create policy "materials_admin_delete" on storage.objects
  for delete using (bucket_id = 'materials' and is_admin());

-- ------------------------------------------------------------
-- SEED DATA — safe to run once
-- ------------------------------------------------------------

-- The current theme (Admin screen can add/switch themes later).
insert into themes (quarter_label, title_en, title_ar, prompt_en, prompt_ar, is_current)
select 'Theme for Q4 2026',
  'How I Respond Matters',
  'استجابتي تُحدث فرقًا',
  'Record a 30-second selfie video telling us about a moment your response made the difference.',
  'سجّل مقطع فيديو ذاتي مدته 30 ثانية تحدثنا فيه عن لحظة أحدثت فيها استجابتك فرقًا.',
  true
where not exists (select 1 from themes where is_current);

-- One bootstrap admin invite code so the very first person can register
-- as an admin (chicken-and-egg: no admin exists yet to create one via the
-- admin screen). ⚠️ Redeem this once, then deactivate it from the Admin
-- screen (or run: update invite_codes set is_active=false where code='FOUNDER-ADMIN';).
insert into invite_codes (code, company, site, role, max_uses)
select 'FOUNDER-ADMIN', 'Head Office', 'Head Office', 'admin', 1
where not exists (select 1 from invite_codes where code = 'FOUNDER-ADMIN');
