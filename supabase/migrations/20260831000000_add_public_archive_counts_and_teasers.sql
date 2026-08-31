alter table public.recordings
add column is_public_teaser boolean not null default false;

alter table public.recordings
add constraint recordings_public_teaser_requires_published_thumbnail
check (
  not is_public_teaser
  or (
    is_published = true
    and thumbnail_object_key is not null
  )
);

create unique index recordings_one_public_teaser_per_case_idx
on public.recordings (case_id)
where is_public_teaser = true;

create or replace function public.get_published_case_archive_counts()
returns table (
  case_id uuid,
  recording_count bigint,
  image_count bigint,
  document_count bigint
)
language sql
stable
security definer
set search_path = ''
as $function$
  with recording_counts as (
    select
      public.recordings.case_id,
      count(*) as recording_count
    from public.recordings
    where public.recordings.is_published = true
    group by public.recordings.case_id
  ),
  image_counts as (
    select
      public.case_images.case_id,
      count(*) as image_count
    from public.case_images
    where public.case_images.is_published = true
    group by public.case_images.case_id
  ),
  document_counts as (
    select
      public.case_documents.case_id,
      count(*) as document_count
    from public.case_documents
    where public.case_documents.is_published = true
    group by public.case_documents.case_id
  )
  select
    public.cases.id as case_id,
    coalesce(recording_counts.recording_count, 0::bigint)
      as recording_count,
    coalesce(image_counts.image_count, 0::bigint)
      as image_count,
    coalesce(document_counts.document_count, 0::bigint)
      as document_count
  from public.cases
  left join recording_counts
    on recording_counts.case_id = public.cases.id
  left join image_counts
    on image_counts.case_id = public.cases.id
  left join document_counts
    on document_counts.case_id = public.cases.id
  where public.cases.case_status = 'published';
$function$;

revoke all
on function public.get_published_case_archive_counts()
from public;

grant execute
on function public.get_published_case_archive_counts()
to anon, authenticated, service_role;
