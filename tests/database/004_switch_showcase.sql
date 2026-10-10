BEGIN;

DO $test$
DECLARE
  case_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  case_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  access public.recording_access;
BEGIN
  INSERT INTO public.cases (id, slug, title)
  VALUES
    (case_a, 'local-showcase-a', 'Local Showcase A'),
    (case_b, 'local-showcase-b', 'Local Showcase B');

  INSERT INTO public.recordings (
    case_id, slug, title, recording_type, is_published
  )
  VALUES
    (case_a, 'local-a-public', 'Showcase A Recording', 'audio', true),
    (case_b, 'local-b-public', 'Showcase B Recording', 'audio', true),
    (case_b, 'local-b-draft', 'Showcase B Draft', 'audio', false);

  -- First showcase.
  PERFORM public.set_case_recording_access_strategy(
    case_a, 'fully_free'
  );

  SELECT access_level INTO access
  FROM public.recordings
  WHERE case_id = case_a AND slug = 'local-a-public';

  IF access <> 'public' THEN
    RAISE EXCEPTION 'FAIL: First showcase recording is not public';
  END IF;

  RAISE NOTICE 'PASS: First showcase recording became public';

  -- Switch the showcase to case B.
  PERFORM public.set_case_recording_access_strategy(
    case_b, 'fully_free'
  );

  SELECT access_level INTO access
  FROM public.recordings
  WHERE case_id = case_a AND slug = 'local-a-public';

  IF access <> 'member' THEN
    RAISE EXCEPTION 'FAIL: Previous showcase remained public';
  END IF;

  RAISE NOTICE 'PASS: Previous showcase became members-only';

  SELECT access_level INTO access
  FROM public.recordings
  WHERE case_id = case_b AND slug = 'local-b-public';

  IF access <> 'public' THEN
    RAISE EXCEPTION 'FAIL: New showcase recording is not public';
  END IF;

  RAISE NOTICE 'PASS: New showcase recording became public';

  SELECT access_level INTO access
  FROM public.recordings
  WHERE case_id = case_b AND slug = 'local-b-draft';

  IF access <> 'member' THEN
    RAISE EXCEPTION 'FAIL: Unpublished recording became public';
  END IF;

  RAISE NOTICE 'PASS: Unpublished recording remained protected';
END;
$test$;

ROLLBACK;
