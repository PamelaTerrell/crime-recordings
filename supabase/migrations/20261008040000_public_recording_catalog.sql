-- Public metadata catalog for published recordings.
-- Does not grant access to protected media.
--
-- SECURITY DEFINER views can bypass underlying table RLS.
-- This view deliberately limits both rows and columns.

BEGIN;

CREATE OR REPLACE VIEW public.public_recording_catalog
WITH (security_barrier = true)
AS
SELECT
  r.id,
  r.case_id,
  r.title,
  r.recording_type,
  r.file_summary,
  r.duration_seconds,
  r.mime_type,
  r.access_level,
  r.sort_order,
  r.created_at
FROM public.recordings r
JOIN public.cases c
  ON c.id = r.case_id
WHERE r.is_published = true
  AND c.case_status = 'published'
  AND c.published_at IS NOT NULL
  AND c.published_at <= now();

REVOKE ALL ON public.public_recording_catalog
FROM PUBLIC;

GRANT SELECT ON public.public_recording_catalog
TO anon, authenticated;

COMMIT;
