-- Run in the Supabase SQL editor. Create an Auth user first, then insert its UUID in dz_admins.
-- All public resources are read-only for visitors. Only explicitly allowlisted users can edit.
create table if not exists public.dz_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.dz_admins enable row level security;
revoke all on public.dz_admins from anon;
grant select on public.dz_admins to authenticated;
create policy "Editors can see only their own authorization" on public.dz_admins
  for select to authenticated using ((select auth.uid()) = user_id);

create table if not exists public.dz_resources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 160),
  category text not null check (category in ('insurance','injury','sick','dental','medication','food','housing','benefits','mental','other')),
  state text not null check (state ~ '^[A-Z]{2}$'),
  city text, address text, phone text, website text, description text,
  eligibility text, cost text, hours text,
  verified_on date, field_verified boolean not null default false,
  published boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint verified_requires_date check (not field_verified or verified_on is not null),
  constraint safe_website check (website is null or website ~ '^https://')
);
create index if not exists dz_resources_search_idx on public.dz_resources (state, category, published);
alter table public.dz_resources enable row level security;
grant select on public.dz_resources to anon, authenticated;
grant insert, update, delete on public.dz_resources to authenticated;

create policy "Public reads published listings" on public.dz_resources
  for select to anon using (published = true);
create policy "Signed in users read published or own admin listings" on public.dz_resources
  for select to authenticated using (
    published = true or exists(select 1 from public.dz_admins a where a.user_id = (select auth.uid()))
  );
create policy "Only approved editors insert" on public.dz_resources
  for insert to authenticated with check (
    exists(select 1 from public.dz_admins a where a.user_id = (select auth.uid()))
  );
create policy "Only approved editors update" on public.dz_resources
  for update to authenticated using (
    exists(select 1 from public.dz_admins a where a.user_id = (select auth.uid()))
  ) with check (
    exists(select 1 from public.dz_admins a where a.user_id = (select auth.uid()))
  );
create policy "Only approved editors delete" on public.dz_resources
  for delete to authenticated using (
    exists(select 1 from public.dz_admins a where a.user_id = (select auth.uid()))
  );

-- ADMIN SETUP (run manually in SQL editor; NEVER publish an actual user UUID in GitHub):
-- insert into public.dz_admins(user_id) values ('REPLACE_WITH_YOUR_AUTH_USER_UUID');
-- Create Auth user via Supabase Authentication > Users, preferably with email confirmation.
-- Disable public signups if you only need one editor. Enable MFA for the editor.
