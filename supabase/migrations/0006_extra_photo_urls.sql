-- Up to a few extra gallery photos alongside the existing primary photo_url.
-- Kept as a plain array on the row (not a separate table) since the cap is
-- small (4) and it's shown as a simple strip, not a paginated gallery.
alter table public.caregiver_profiles
  add column extra_photo_urls text[] not null default '{}';
