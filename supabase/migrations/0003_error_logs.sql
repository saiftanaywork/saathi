-- Client-side error tracking. Anyone (including anonymous visitors) can
-- report an error, since errors can happen before login; only admins can
-- read the log. No third-party service (Sentry etc.) is wired up -- this
-- is a deliberately minimal, self-hosted alternative that doesn't require
-- provisioning an external account.

create table public.error_logs (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  stack text,
  url text,
  user_id uuid references public.profiles(id),
  context jsonb,
  created_at timestamptz not null default now()
);
create index error_logs_created_at_idx on public.error_logs (created_at desc);

alter table public.error_logs enable row level security;

create policy error_logs_insert_all on public.error_logs
  for insert with check (true);
create policy error_logs_select_admin on public.error_logs
  for select using (internal.is_admin(auth.uid()));
