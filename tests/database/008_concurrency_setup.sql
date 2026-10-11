-- Local-only concurrency test fixtures.
-- These records must not be created in production.

INSERT INTO public.cases (id, slug, title)
VALUES (
  'c0000000-0000-4000-8000-000000000008',
  'local-concurrency-test',
  'Local Concurrency Test'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.recordings (
  id,
  case_id,
  slug,
  title,
  recording_type,
  is_published
)
VALUES (
  'd0000000-0000-4000-8000-000000000008',
  'c0000000-0000-4000-8000-000000000008',
  'local-concurrency-recording',
  'Local Concurrency Recording',
  'audio',
  true
)
ON CONFLICT (id) DO NOTHING;
