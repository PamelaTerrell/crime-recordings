begin;

alter table public.case_images
add column is_public_teaser boolean not null default false;

alter table public.case_images
add constraint case_images_public_teaser_requires_published_object
check (
  not is_public_teaser
  or (
    is_published = true
    and object_key is not null
    and pg_catalog.btrim(object_key) <> ''
  )
);

create unique index case_images_one_public_teaser_per_case_idx
on public.case_images (case_id)
where is_public_teaser = true;

create or replace function public.enforce_single_public_archive_teaser()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  teaser_object_key text;
begin
  if new.is_public_teaser is not true then
    return new;
  end if;

  if tg_table_schema <> 'public' then
    raise exception 'Unsupported public archive teaser source.'
      using errcode = '22023';
  end if;

  if tg_table_name = 'recordings' then
    teaser_object_key :=
      pg_catalog.to_jsonb(new) ->> 'thumbnail_object_key';

    if new.is_published is distinct from true
      or teaser_object_key is null
      or pg_catalog.btrim(teaser_object_key) = '' then
      raise exception
        'A recording teaser must be published and have a thumbnail.'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'case_images' then
    teaser_object_key :=
      pg_catalog.to_jsonb(new) ->> 'object_key';

    if new.is_published is distinct from true
      or teaser_object_key is null
      or pg_catalog.btrim(teaser_object_key) = '' then
      raise exception
        'A case-image teaser must be published and have an object.'
        using errcode = '23514';
    end if;
  else
    raise exception 'Unsupported public archive teaser source.'
      using errcode = '22023';
  end if;

  perform public.cases.id
  from public.cases
  where public.cases.id = new.case_id
  for update;

  if not found then
    raise exception 'The teaser parent case could not be found.'
      using errcode = '23503';
  end if;

  if tg_table_name = 'recordings' then
    update public.recordings
    set is_public_teaser = false
    where public.recordings.case_id = new.case_id
      and public.recordings.id <> new.id
      and public.recordings.is_public_teaser = true;

    update public.case_images
    set is_public_teaser = false
    where public.case_images.case_id = new.case_id
      and public.case_images.is_public_teaser = true;
  else
    update public.case_images
    set is_public_teaser = false
    where public.case_images.case_id = new.case_id
      and public.case_images.id <> new.id
      and public.case_images.is_public_teaser = true;

    update public.recordings
    set is_public_teaser = false
    where public.recordings.case_id = new.case_id
      and public.recordings.is_public_teaser = true;
  end if;

  return new;
end;
$function$;

revoke execute
on function public.enforce_single_public_archive_teaser()
from public;

create trigger recordings_enforce_single_public_archive_teaser
before insert or update of
  is_public_teaser,
  case_id,
  is_published,
  thumbnail_object_key
on public.recordings
for each row
when (new.is_public_teaser = true)
execute function public.enforce_single_public_archive_teaser();

create trigger case_images_enforce_single_public_archive_teaser
before insert or update of
  is_public_teaser,
  case_id,
  is_published,
  object_key
on public.case_images
for each row
when (new.is_public_teaser = true)
execute function public.enforce_single_public_archive_teaser();

commit;
