-- A later out-of-band migration (adding avatar_url to match_caregivers'
-- return type) dropped and recreated this function without the
-- `set search_path` hardening applied in 0001_init.sql's follow-up
-- security pass. Restoring it.
alter function public.match_caregivers(text[], text[], text[], numeric, numeric, uuid) set search_path = public;
