BEGIN;

DO $test$
DECLARE
  test_case uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  first_recording uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  second_recording uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  draft_recording uuid := 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  public_count integer;
BEGIN
  INSERT INTO public.cases (id, slug, title)
  VALUES (test_case, 'local-free-sample', 'Local Free Sample Case');

  INSERT INTO public.recordings (
    id, case_id, slug, title, recording_type, is_published
  )
  VALUES
    (first_recording, test_case, 'sample-one', 'First Sample', 'audio', true),
    (second_recording, test_case, 'sample-two', 'Second Sample', 'audio', true),
    (draft_recording, test_case, 'sample-draft', 'Unpublished Sample', 'audio', false);

  PERFORM public.set_case_recording_access_strategy(
    test_case, 'free_sample', first_recording
  );

  SELECT COUNT(*) INTO public_count
  FROM public.recordings
  WHERE case_id = test_case AND access_level = 'public';

  IF public_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: Expected one public recording, found %', public_count;
  END IF;

  RAISE NOTICE 'PASS: Exactly one recording is public';

  PERFORM public.set_case_recording_access_strategy(
    test_case, 'free_sample', second_recording
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.recordings
    WHERE id = first_recording AND access_level = 'member'
  ) THEN
    RAISE EXCEPTION 'FAIL: Previous free recording remains public';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.recordings
    WHERE id = second_recording AND access_level = 'public'
  ) THEN
    RAISE EXCEPTION 'FAIL: New free recording was not made public';
  END IF;

  RAISE NOTICE 'PASS: Switching the free recording updates both permissions';

  IF NOT EXISTS (
    SELECT 1 FROM public.recordings
    WHERE id = draft_recording AND access_level = 'member'
  ) THEN
    RAISE EXCEPTION 'FAIL: Unpublished recording was exposed';
  END IF;

  RAISE NOTICE 'PASS: Unpublished recording remains protected';
END;
$test$;

ROLLBACK;
