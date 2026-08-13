-- Saathi schema: profiles, caregiver listings, background checks,
-- search history (for matching), contact requests, favorites, and the
-- match_caregivers() ranking function.
--
-- profiles.id is NOT foreign-keyed to auth.users: for real signed-up users
-- it is set equal to auth.uid() (via the handle_new_user trigger below), but
-- the ten seed caregiver listings are demo data with no login of their own,
-- so they get random ids and no corresponding auth.users row.

create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  role text not null default 'family' check (role in ('family', 'caregiver', 'admin')),
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.caregiver_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  headline text not null default '',
  bio text not null default '',
  city text not null,
  languages text[] not null default '{}',
  care_types text[] not null default '{}',
  rate numeric not null default 0,
  experience_years int not null default 0,
  availability text not null default '',
  initials text not null default '',
  accent text not null default 'terracotta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.background_checks (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

create table public.family_search_history (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.profiles(id) on delete cascade,
  languages text[] not null default '{}',
  cities text[] not null default '{}',
  care_types text[] not null default '{}',
  min_rate numeric,
  max_rate numeric,
  created_at timestamptz not null default now()
);

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.profiles(id) on delete cascade,
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create table public.favorites (
  family_id uuid not null references public.profiles(id) on delete cascade,
  caregiver_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (family_id, caregiver_id)
);

create index caregiver_profiles_city_idx on public.caregiver_profiles (city);
create index caregiver_profiles_languages_idx on public.caregiver_profiles using gin (languages);
create index caregiver_profiles_care_types_idx on public.caregiver_profiles using gin (care_types);
create index background_checks_caregiver_idx on public.background_checks (caregiver_id, requested_at desc);
create index family_search_history_family_idx on public.family_search_history (family_id, created_at desc);

-- ---------------------------------------------------------------------
-- Auth wiring: create a profile row when someone signs up, and only ever
-- default them to 'family' or 'caregiver' from client-supplied metadata.
-- 'admin' can never come from signup metadata -- it is only ever set later
-- by a direct SQL update run by a project owner.
-- ---------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'caregiver' then 'caregiver' else 'family' end,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin');
$$;

-- A client can update their own profile row (e.g. full_name), but only an
-- admin can change anyone's role -- prevents self-promotion to admin.
create function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin(auth.uid()) then
    raise exception 'only admins can change role';
  end if;
  return new;
end;
$$;

create trigger profiles_block_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.caregiver_profiles enable row level security;
alter table public.background_checks enable row level security;
alter table public.family_search_history enable row level security;
alter table public.contact_requests enable row level security;
alter table public.favorites enable row level security;

-- profiles: publicly readable (it's a directory; caregiver names need to
-- show up without login), self-updatable (role changes blocked by trigger).
create policy profiles_select_all on public.profiles for select using (true);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id);

-- caregiver_profiles: publicly readable directory, writable only by the
-- caregiver who owns the listing.
create policy caregiver_profiles_select_all on public.caregiver_profiles for select using (true);
create policy caregiver_profiles_insert_own on public.caregiver_profiles for insert with check (auth.uid() = id);
create policy caregiver_profiles_update_own on public.caregiver_profiles for update using (auth.uid() = id);
create policy caregiver_profiles_delete_own on public.caregiver_profiles for delete using (auth.uid() = id);

-- background_checks: status is public (shown as a badge on profiles), a
-- caregiver can only ever request a check for themselves as 'pending', and
-- only an admin can move it to verified/rejected.
create policy background_checks_select_all on public.background_checks for select using (true);
create policy background_checks_insert_own on public.background_checks
  for insert with check (auth.uid() = caregiver_id and status = 'pending');
create policy background_checks_update_admin on public.background_checks
  for update using (public.is_admin(auth.uid()));

-- family_search_history: private to the family that generated it (and admins).
create policy family_search_history_insert_own on public.family_search_history
  for insert with check (auth.uid() = family_id);
create policy family_search_history_select_own on public.family_search_history
  for select using (auth.uid() = family_id or public.is_admin(auth.uid()));

-- contact_requests: visible to sender and recipient (and admins).
create policy contact_requests_insert_own on public.contact_requests
  for insert with check (auth.uid() = family_id);
create policy contact_requests_select_participant on public.contact_requests
  for select using (auth.uid() = family_id or auth.uid() = caregiver_id or public.is_admin(auth.uid()));

-- favorites: private to the family.
create policy favorites_all_own on public.favorites
  for all using (auth.uid() = family_id) with check (auth.uid() = family_id);

-- ---------------------------------------------------------------------
-- match_caregivers: weighted ranking used for the "Recommended for you"
-- rail and the "Find my match" quiz. Soft-scores rather than hard-filters,
-- so it still returns a full ranked list even for loose/empty criteria.
-- Explicit criteria (languages/city/care types/budget) carry the most
-- weight; a family's own search history nudges the ranking further;
-- verified background checks and experience add a small trust boost.
-- ---------------------------------------------------------------------

create function public.match_caregivers(
  p_languages text[] default '{}',
  p_cities text[] default '{}',
  p_care_types text[] default '{}',
  p_min_rate numeric default null,
  p_max_rate numeric default null,
  p_family_id uuid default null
)
returns table (
  caregiver_id uuid,
  full_name text,
  headline text,
  city text,
  languages text[],
  care_types text[],
  rate numeric,
  experience_years int,
  availability text,
  initials text,
  accent text,
  background_status text,
  score numeric
)
language sql
stable
as $$
  with history as (
    select
      (select coalesce(array_agg(distinct l), '{}'::text[])
         from public.family_search_history fsh, unnest(fsh.languages) as l
         where p_family_id is not null and fsh.family_id = p_family_id) as hist_languages,
      (select coalesce(array_agg(distinct c), '{}'::text[])
         from public.family_search_history fsh, unnest(fsh.cities) as c
         where p_family_id is not null and fsh.family_id = p_family_id) as hist_cities,
      (select coalesce(array_agg(distinct t), '{}'::text[])
         from public.family_search_history fsh, unnest(fsh.care_types) as t
         where p_family_id is not null and fsh.family_id = p_family_id) as hist_care_types
  ),
  latest_bg as (
    select distinct on (caregiver_id) caregiver_id, status
    from public.background_checks
    order by caregiver_id, requested_at desc
  )
  select
    cp.id,
    p.full_name,
    cp.headline,
    cp.city,
    cp.languages,
    cp.care_types,
    cp.rate,
    cp.experience_years,
    cp.availability,
    cp.initials,
    cp.accent,
    coalesce(bg.status, 'none'),
    (
      (case when cp.languages && p_languages then 10 else 0 end)
      + (case when cp.city = any(p_cities) then 15 else 0 end)
      + (case when cp.care_types && p_care_types then 10 else 0 end)
      + (case
          when p_max_rate is null then 0
          when cp.rate <= p_max_rate then 8
          else greatest(0, 8 - (cp.rate - p_max_rate))
        end)
      + (case when p_min_rate is not null and cp.rate >= p_min_rate then 2 else 0 end)
      + (select case when cp.languages && h.hist_languages then 3 else 0 end from history h)
      + (select case when cp.city = any(h.hist_cities) then 4 else 0 end from history h)
      + (select case when cp.care_types && h.hist_care_types then 3 else 0 end from history h)
      + (case when coalesce(bg.status, 'none') = 'verified' then 5 else 0 end)
      + least(cp.experience_years, 15) * 0.3
    )::numeric as score
  from public.caregiver_profiles cp
  join public.profiles p on p.id = cp.id
  left join latest_bg bg on bg.caregiver_id = cp.id
  order by score desc, cp.experience_years desc nulls last;
$$;

grant execute on function public.match_caregivers to anon, authenticated;

-- ---------------------------------------------------------------------
-- Seed data: the ten demo caregiver listings from the original artifact.
-- Deterministic ids so re-running is idempotent.
-- ---------------------------------------------------------------------

insert into public.profiles (id, role, full_name) values
  ('00000000-0000-0000-0000-000000000c01', 'caregiver', 'Lakshmi Iyer'),
  ('00000000-0000-0000-0000-000000000c02', 'caregiver', 'Simran Kaur'),
  ('00000000-0000-0000-0000-000000000c03', 'caregiver', 'Radha Krishnan'),
  ('00000000-0000-0000-0000-000000000c04', 'caregiver', 'Priya Patel'),
  ('00000000-0000-0000-0000-000000000c05', 'caregiver', 'Anjali Reddy'),
  ('00000000-0000-0000-0000-000000000c06', 'caregiver', 'Meera Nair'),
  ('00000000-0000-0000-0000-000000000c07', 'caregiver', 'Harpreet Singh'),
  ('00000000-0000-0000-0000-000000000c08', 'caregiver', 'Kavita Sharma'),
  ('00000000-0000-0000-0000-000000000c09', 'caregiver', 'Divya Menon'),
  ('00000000-0000-0000-0000-000000000c10', 'caregiver', 'Sunita Chaudhary')
on conflict (id) do nothing;

insert into public.caregiver_profiles
  (id, headline, bio, city, languages, care_types, rate, experience_years, availability, initials, accent)
values
  ('00000000-0000-0000-0000-000000000c01',
   'Patient elder care, especially for memory-related needs',
   'I''ve spent the last nine years caring for aging parents in families much like my own — most recently three years with a grandmother living with dementia. I move slowly and explain things twice, because that''s what worked. Comfortable with medication reminders, gentle mobility support, and just sitting with someone through a long afternoon.',
   'Irving', array['Tamil','Telugu','English'], array['elder','dementia'], 22, 9, 'Weekdays, 8am–6pm', 'LI', 'terracotta'),
  ('00000000-0000-0000-0000-000000000c02',
   'Postpartum support for the first 40 days and beyond',
   'I specialize in the confinement period — newborn care, helping mom rest and recover, and the small routines (oil massage, sitz baths, warm meals) that many families grew up with. I''ve supported eleven new mothers in the DFW area, several through repeat bookings for a second baby.',
   'Frisco', array['Punjabi','Hindi','English'], array['postpartum','hourly'], 28, 6, 'Live-in for 4–6 weeks, or daytime hourly', 'SK', 'teal'),
  ('00000000-0000-0000-0000-000000000c03',
   'Warm company and a steady hand around the house',
   'Most of my clients don''t need medical care so much as someone to share a meal with, watch a serial with, or take a slow walk around the block. I also help keep the kitchen and common areas tidy. I cook a mean rasam if anyone''s missing home food.',
   'Plano', array['Tamil','Malayalam','English'], array['companionship','housekeeping'], 20, 5, 'Weekday afternoons', 'RK', 'ochre'),
  ('00000000-0000-0000-0000-000000000c04',
   'Reliable elder care with driving for appointments and errands',
   'Eleven years caring for elders, mostly in Gujarati and Hindi-speaking households. I hold a clean Texas driving record and handle doctor visits, temple trips, and grocery runs. I understand vegetarian kitchens and dietary preferences without needing to be told twice.',
   'Carrollton', array['Gujarati','Hindi','English'], array['elder','driving'], 24, 11, 'Full-time, Mon–Sat', 'PP', 'rose'),
  ('00000000-0000-0000-0000-000000000c05',
   'Newborn care with a calm, unhurried approach',
   'I take overnight shifts so new parents can actually sleep — feeding, diapering, soothing, and light nursery tidying. Trained in infant CPR. I keep things quiet and calm, and I''m happy to hand the baby over for feeds and step right back out.',
   'Richardson', array['Telugu','English'], array['postpartum'], 26, 4, 'Nights, first 6 weeks', 'AR', 'moss'),
  ('00000000-0000-0000-0000-000000000c06',
   'Live-in elder care, long-term and dependable',
   'I''ve lived with and cared for three families over fourteen years, each for two or more years at a stretch. I''m looking for a long-term placement rather than short bookings. Comfortable with mobility aids, meal prep, and managing a full day''s routine independently.',
   'Irving', array['Malayalam','English','Tamil'], array['elder','livein'], 19, 14, 'Live-in, 5 days/week with weekends off', 'MN', 'terracotta'),
  ('00000000-0000-0000-0000-000000000c07',
   'Elder companionship and errands, especially for dads and uncles',
   'I find a lot of families are looking for female caregivers by default, but I''ve had great long-term matches with fathers and uncles who wanted someone to talk sports and Punjabi news with, plus a hand getting to appointments. Steady, punctual, easygoing.',
   'Frisco', array['Punjabi','Hindi','English'], array['elder','driving','companionship'], 23, 7, 'Weekday mornings and Saturdays', 'HS', 'teal'),
  ('00000000-0000-0000-0000-000000000c08',
   'Dementia-experienced companionship care',
   'I worked in memory care facilities for four years before moving to private care, so I''ve seen a wide range of what dementia can look like day to day. I stay calm through repetition and confusion, and I focus on keeping the person''s dignity front and center.',
   'Richardson', array['Hindi','English'], array['dementia','companionship'], 25, 8, 'Flexible, hourly', 'KS', 'ochre'),
  ('00000000-0000-0000-0000-000000000c09',
   'Confinement care rooted in Kerala traditions',
   'Ten years supporting new mothers with traditional Kerala postpartum care — herbal baths, oil massage for mother and baby, and pathya (confinement diet) cooking. I move in for the first month so I''m there for every feed, cry, and 3am worry.',
   'Plano', array['Malayalam','Tamil','English'], array['postpartum','livein'], 27, 10, 'Live-in, first 4 weeks', 'DM', 'rose'),
  ('00000000-0000-0000-0000-000000000c10',
   'Everyday help for aging parents — meals, tidying, and company',
   'I look after two elderly clients part-time right now and have room for a third. I cook simple home meals, keep the house in order, and make sure medications are taken on schedule. References available from both current families.',
   'Carrollton', array['Hindi','Punjabi','English'], array['elder','housekeeping','companionship'], 21, 5, 'Weekdays, 9am–3pm', 'SC', 'moss')
on conflict (id) do nothing;

insert into public.background_checks (caregiver_id, status, reviewed_at)
values
  ('00000000-0000-0000-0000-000000000c01', 'verified', now()),
  ('00000000-0000-0000-0000-000000000c02', 'verified', now()),
  ('00000000-0000-0000-0000-000000000c04', 'verified', now()),
  ('00000000-0000-0000-0000-000000000c06', 'verified', now()),
  ('00000000-0000-0000-0000-000000000c09', 'verified', now())
on conflict do nothing;
