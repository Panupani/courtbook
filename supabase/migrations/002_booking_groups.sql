-- Migration: add group_id to bookings for multi-slot / multi-court sessions
alter table bookings
  add column if not exists group_id uuid;

create index if not exists bookings_group_id_idx
  on bookings (group_id)
  where group_id is not null;
