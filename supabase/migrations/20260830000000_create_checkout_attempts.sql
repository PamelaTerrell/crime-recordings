begin;

create table public.checkout_attempts (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  stripe_checkout_session_id text,

  status text not null default 'creating'
    check (
      status in (
        'creating',
        'open',
        'completed',
        'expired'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint checkout_attempts_session_id_unique
    unique (stripe_checkout_session_id),

  constraint checkout_attempts_session_required
    check (
      status = 'creating'
      or stripe_checkout_session_id is not null
    )
);

create unique index checkout_attempts_one_open_per_user_idx
  on public.checkout_attempts (user_id)
  where status in ('creating', 'open');

alter table public.checkout_attempts
  enable row level security;

revoke all privileges
  on table public.checkout_attempts
  from public, anon, authenticated;

grant select, insert, update
  on table public.checkout_attempts
  to service_role;

commit;
