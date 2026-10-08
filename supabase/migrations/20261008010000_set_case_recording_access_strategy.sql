begin;

create or replace function public.set_case_recording_access_strategy(
  p_case_id uuid,
  p_strategy text,
  p_free_recording_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  previous_showcase record;
  saved_recording_id uuid;
begin
  if p_case_id is null then
    raise exception 'A case ID is required.';
  end if;

  if p_strategy is null or p_strategy not in (
    'fully_free',
    'free_sample',
    'members_only'
  ) then
    raise exception 'Invalid case access strategy.';
  end if;

  -- Serialize strategy changes across all cases.
  -- Lock rows in a deterministic order before updating permissions.
  perform 1
  from public.cases as c
  order by c.id
  for update of c;

  if not exists (
    select 1 from public.cases where id = p_case_id
  ) then
    raise exception 'Case not found.';
  end if;

  if p_strategy = 'free_sample' then
    if p_free_recording_id is null or not exists (
      select 1
      from public.recordings r
      where r.id = p_free_recording_id
        and r.case_id = p_case_id
        and r.is_published = true
    ) then
      raise exception
        'Select a published recording belonging to this case.';
    end if;
  end if;

  if p_strategy = 'fully_free' then
    for previous_showcase in
      select id, free_featured_recording_id
      from public.cases
      where recording_access_strategy = 'fully_free'
        and id <> p_case_id
    loop
      saved_recording_id := null;

      if previous_showcase.free_featured_recording_id is not null then
        select r.id into saved_recording_id
        from public.recordings r
        where r.id = previous_showcase.free_featured_recording_id
          and r.case_id = previous_showcase.id
          and r.is_published = true;
      end if;

      update public.cases
      set recording_access_strategy = 'members_only'
      where id = previous_showcase.id;

      update public.recordings
      set access_level = 'member'
      where case_id = previous_showcase.id
        and access_level is distinct from 'member';

      if saved_recording_id is not null then
        update public.recordings
        set access_level = 'public'
        where id = saved_recording_id;

        update public.cases
        set recording_access_strategy = 'free_sample'
        where id = previous_showcase.id;
      end if;
    end loop;
  end if;

  -- Remove the active sample designation before permission updates.
  update public.cases
  set recording_access_strategy = 'members_only'
  where id = p_case_id;

  update public.recordings
  set access_level = 'member'
  where case_id = p_case_id
    and access_level is distinct from 'member';

  if p_strategy = 'fully_free' then
    update public.recordings
    set access_level = 'public'
    where case_id = p_case_id
      and is_published = true;

    update public.cases
    set recording_access_strategy = 'fully_free'
    where id = p_case_id;

  elsif p_strategy = 'free_sample' then
    update public.recordings
    set access_level = 'public'
    where id = p_free_recording_id;

    update public.cases
    set recording_access_strategy = 'free_sample',
        free_featured_recording_id = p_free_recording_id
    where id = p_case_id;
  end if;
end;
$function$;

revoke all
on function public.set_case_recording_access_strategy(
  uuid, text, uuid
)
from public, anon, authenticated;

grant execute
on function public.set_case_recording_access_strategy(
  uuid, text, uuid
)
to service_role;

commit;
