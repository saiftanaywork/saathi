-- Aggregate-only demand signal for the caregiver-side pre-signup teaser:
-- exposes a count only, never the underlying rows, so a signed-out
-- caregiver can see real demand without any change to
-- family_search_history's existing private RLS policy.
create function public.count_family_interest(p_city text, p_care_type text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct family_id)::int
  from public.family_search_history
  where p_city = any(cities) or p_care_type = any(care_types);
$$;

grant execute on function public.count_family_interest to anon, authenticated;
