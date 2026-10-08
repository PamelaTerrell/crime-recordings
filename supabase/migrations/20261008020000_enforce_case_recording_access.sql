-- Crime Recordings: database-level recording access enforcement.
--
-- Access rules:
-- 1. At most one case may use 'fully_free'.
-- 2. In a fully_free case, published recordings must be public.
-- 3. In a free_sample case, only the selected published recording
--    may be public; all others must be members-only.
-- 4. In a members_only case, no recording may be public.
-- 5. Unpublished recordings must never be publicly playable.
-- 6. Ordinary inserts and updates must not bypass these rules.
-- 7. Strategy switching must be atomic and coordinated with
--    database triggers and concurrent recording writes.
-- 8. Direct client calls must not bypass admin/editor authorization.
--
-- Implementation and database tests will be added before this
-- migration is applied to the hosted Supabase project.

-- Enforce recording access on ordinary inserts and updates.
-- The strategy-switching RPC will be revised to use this same policy.
begin;

create or replace function public.enforce_case_recording_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  case_strategy text;
  selected_recording_id uuid;
begin
  -- Serialize recording-access changes with showcase switching.
  perform pg_catalog.pg_advisory_xact_lock(20261008, 1);

  select c.recording_access_strategy,
         c.free_featured_recording_id
  into case_strategy, selected_recording_id
  from public.cases c
  where c.id = new.case_id;

  if not found then
    raise exception 'Recording case does not exist.';
  end if;

  if new.is_published is not true then
    new.access_level := 'member';
  elsif case_strategy = 'fully_free' then
    new.access_level := 'public';
  elsif case_strategy = 'free_sample'
    and new.id = selected_recording_id then
    new.access_level := 'public';
  else
    new.access_level := 'member';
  end if;

  return new;
end;
$function$;

create trigger recordings_enforce_case_recording_access
before insert or update of
  case_id, access_level, is_published
on public.recordings
for each row
execute function public.enforce_case_recording_access();

revoke execute
on function public.enforce_case_recording_access()
from public, anon, authenticated;

commit;
