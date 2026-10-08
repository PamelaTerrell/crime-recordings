begin;

alter table public.cases
add column recording_access_strategy text
not null default 'members_only';

alter table public.cases
add constraint cases_recording_access_strategy_check
check (
  recording_access_strategy in (
    'fully_free',
    'free_sample',
    'members_only'
  )
);

create unique index cases_one_fully_free_showcase_idx
on public.cases ((true))
where recording_access_strategy = 'fully_free';

alter table public.cases
add column free_featured_recording_id uuid;

create unique index if not exists
recordings_id_case_id_unique_idx
on public.recordings (id, case_id);

alter table public.cases
add constraint cases_free_featured_recording_fk
foreign key (free_featured_recording_id, id)
references public.recordings (id, case_id);

create or replace function public.validate_free_featured_recording()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.free_featured_recording_id is null
    or new.recording_access_strategy <> 'free_sample' then
    return new;
  end if;

  if not exists (
    select 1
    from public.recordings
    where public.recordings.id = new.free_featured_recording_id
      and public.recordings.case_id = new.id
      and public.recordings.is_published = true
      and public.recordings.access_level = 'public'
  ) then
    raise exception
      'The free featured recording must belong to this case, be published, and have public access.'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

create trigger cases_validate_free_featured_recording
before insert or update of free_featured_recording_id, recording_access_strategy
on public.cases
for each row
execute function public.validate_free_featured_recording();

revoke execute
on function public.validate_free_featured_recording()
from public, anon, authenticated;

-- Ordinary recording edits must not invalidate an active free sample.
-- Case strategy changes will be coordinated by a separate transactional
-- database operation that updates the case and recording permissions together.
create or replace function public.protect_free_featured_recording()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if exists (
    select 1
    from public.cases
    where public.cases.free_featured_recording_id = old.id
      and public.cases.recording_access_strategy = 'free_sample'
  ) then
    if new.case_id is distinct from old.case_id
      or new.access_level is distinct from 'public'
      or new.is_published is distinct from true then
      raise exception
        'Remove or replace the free featured recording selection before restricting or moving this recording.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$function$;

create trigger recordings_protect_free_featured_recording
before update of case_id, access_level, is_published
on public.recordings
for each row
execute function public.protect_free_featured_recording();

revoke execute
on function public.protect_free_featured_recording()
from public, anon, authenticated;

comment on column public.cases.free_featured_recording_id is
'Selected free featured recording for the public case page.';

commit;
