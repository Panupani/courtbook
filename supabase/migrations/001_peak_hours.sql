-- Migration: add peak pricing columns to operating_hours
alter table operating_hours
  add column if not exists peak_start_time  time,
  add column if not exists peak_end_time    time,
  add column if not exists peak_hourly_rate numeric(10,2);

-- Constraint: if any peak field is set, all three must be set
alter table operating_hours
  drop constraint if exists peak_hours_all_or_none;

alter table operating_hours
  add constraint peak_hours_all_or_none check (
    (peak_start_time is null and peak_end_time is null and peak_hourly_rate is null)
    or
    (peak_start_time is not null and peak_end_time is not null and peak_hourly_rate is not null)
  );
