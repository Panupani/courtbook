-- ============================================================
-- CourtBook — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- VENUES
-- ────────────────────────────────────────────────────────────
create table if not exists venues (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text not null default '',
  description text,
  image_url   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- COURTS
-- ────────────────────────────────────────────────────────────
create table if not exists courts (
  id          uuid primary key default uuid_generate_v4(),
  venue_id    uuid not null references venues(id) on delete cascade,
  name        text not null,
  description text,
  image_url   text,
  hourly_rate numeric(10,2) not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- OPERATING HOURS
-- ────────────────────────────────────────────────────────────
create table if not exists operating_hours (
  id                     uuid primary key default uuid_generate_v4(),
  court_id               uuid not null references courts(id) on delete cascade,
  day_of_week            int not null check (day_of_week between 0 and 6),
  open_time              time not null,
  close_time             time not null,
  slot_duration_minutes  int not null default 60,
  -- peak pricing (all three must be set together or all null)
  peak_start_time        time,
  peak_end_time          time,
  peak_hourly_rate       numeric(10,2),
  unique (court_id, day_of_week),
  constraint peak_hours_all_or_none check (
    (peak_start_time is null and peak_end_time is null and peak_hourly_rate is null)
    or
    (peak_start_time is not null and peak_end_time is not null and peak_hourly_rate is not null)
  )
);

-- ────────────────────────────────────────────────────────────
-- BOOKINGS
-- ────────────────────────────────────────────────────────────
create table if not exists bookings (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references profiles(id) on delete cascade,
  court_id      uuid not null references courts(id) on delete cascade,
  booking_date  date not null,
  start_time    time not null,
  end_time      time not null,
  total_price   numeric(10,2) not null default 0,
  status        text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled')),
  notes         text,
  created_at    timestamptz not null default now()
);

-- Prevent double-booking (same court, same date, overlapping time, non-cancelled)
create unique index if not exists bookings_no_overlap
  on bookings (court_id, booking_date, start_time)
  where status <> 'cancelled';

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════

alter table profiles enable row level security;
alter table venues enable row level security;
alter table courts enable row level security;
alter table operating_hours enable row level security;
alter table bookings enable row level security;

-- Helper: is current user an admin?
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── profiles ──
drop policy if exists "profiles: user reads own" on profiles;
create policy "profiles: user reads own"
  on profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: user updates own" on profiles;
create policy "profiles: user updates own"
  on profiles for update
  using (id = auth.uid());

drop policy if exists "profiles: insert own" on profiles;
create policy "profiles: insert own"
  on profiles for insert
  with check (id = auth.uid());

-- ── venues ──
drop policy if exists "venues: public read" on venues;
create policy "venues: public read"
  on venues for select using (true);

drop policy if exists "venues: admin write" on venues;
create policy "venues: admin write"
  on venues for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── courts ──
drop policy if exists "courts: public read" on courts;
create policy "courts: public read"
  on courts for select using (true);

drop policy if exists "courts: admin write" on courts;
create policy "courts: admin write"
  on courts for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── operating_hours ──
drop policy if exists "hours: public read" on operating_hours;
create policy "hours: public read"
  on operating_hours for select using (true);

drop policy if exists "hours: admin write" on operating_hours;
create policy "hours: admin write"
  on operating_hours for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── bookings ──
drop policy if exists "bookings: customer reads own" on bookings;
create policy "bookings: customer reads own"
  on bookings for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "bookings: authenticated insert" on bookings;
create policy "bookings: authenticated insert"
  on bookings for insert
  with check (user_id = auth.uid() and auth.uid() is not null);

drop policy if exists "bookings: admin update" on bookings;
create policy "bookings: admin update"
  on bookings for update
  using (public.is_admin());
