-- Crime Recordings: coordinated recording writes.
-- WORK IN PROGRESS — not approved for production.
--
-- Goals:
-- 1. Keep PostgreSQL authoritative over recording access.
-- 2. Acquire case locks before recording row modifications.
-- 3. Preserve existing authenticated staff authorization.
-- 4. Prevent direct writes from bypassing coordination.
-- 5. Avoid the confirmed recording/case lock-order deadlock.
--
-- This migration is intentionally incomplete and must not
-- be applied until the write operations and permissions
-- have been implemented and tested together.

begin;

create or replace function private.effective_recording_access(
  p_strategy text,
  p_selected_recording_id uuid,
  p_recording_id uuid,
  p_is_published boolean
)
returns public.recording_access
language sql
immutable
set search_path = ''
as $function$
  select case
    when p_is_published is not true
      then 'member'::public.recording_access
    when p_strategy = 'fully_free'
      then 'public'::public.recording_access
    when p_strategy = 'free_sample'
      and p_selected_recording_id = p_recording_id
      then 'public'::public.recording_access
    else 'member'::public.recording_access
  end;
$function$;

revoke all
on function private.effective_recording_access(
  text, uuid, uuid, boolean
)
from public, anon, authenticated;

commit;

-- Coordinate recording writes with showcase strategy changes.
-- The matching advisory lock is acquired by
-- public.set_case_recording_access_strategy.
--
-- BEFORE STATEMENT is essential: it runs before the recording rows
-- are locked by the INSERT, UPDATE, or DELETE statement.

CREATE OR REPLACE FUNCTION private.lock_recording_write_statement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(20261008, 1);
  RETURN NULL;
END;
$function$;

REVOKE ALL
ON FUNCTION private.lock_recording_write_statement()
FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS recordings_coordinate_writes
ON public.recordings;

CREATE TRIGGER recordings_coordinate_writes
BEFORE INSERT OR UPDATE OR DELETE
ON public.recordings
FOR EACH STATEMENT
EXECUTE FUNCTION private.lock_recording_write_statement();
