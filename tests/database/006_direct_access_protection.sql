BEGIN;

DO $test$
DECLARE
  test_case uuid := 'a1111111-1111-4111-8111-111111111111';
  recording_a uuid := 'a2222222-2222-4222-8222-222222222222';
  recording_b uuid := 'a3333333-3333-4333-8333-333333333333';
BEGIN
  INSERT INTO public.cases (id, slug, title)
  VALUES (test_case, 'local-access-security-test', 'Access Security Test');

  INSERT INTO public.recordings (
    id, case_id, slug, title, recording_type, is_published
  )
  VALUES
    (recording_a, test_case, 'protected-a', 'Protected Recording', 'audio', true),
    (recording_b, test_case, 'protected-b', 'Free Sample Recording', 'audio', true);

  -- Attempt to bypass the members-only strategy.
  UPDATE public.recordings
  SET access_level = 'public'
  WHERE id = recording_a;

  IF NOT EXISTS (
    SELECT 1 FROM public.recordings
    WHERE id = recording_a AND access_level = 'member'
  ) THEN
    RAISE EXCEPTION 'FAIL: Direct update exposed paid content';
  END IF;

  RAISE NOTICE 'PASS: Direct update cannot expose members-only content';

  -- Activate one legitimate free sample.
  PERFORM public.set_case_recording_access_strategy(
    test_case, 'free_sample', recording_b
  );

  -- Attempt to unpublish the selected free recording.
  BEGIN
    UPDATE public.recordings
    SET is_published = false
    WHERE id = recording_b;

    RAISE EXCEPTION 'FAIL: Selected free recording was unpublished';

  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: Active free sample cannot be unpublished';
  END;

  -- Verify the rejected update did not alter the selected recording.
  IF NOT EXISTS (
    SELECT 1 FROM public.recordings
    WHERE id = recording_b
      AND is_published = true
      AND access_level = 'public'
  ) THEN
    RAISE EXCEPTION 'FAIL: Selected free recording was modified';
  END IF;

  RAISE NOTICE 'PASS: Selected free recording remains published and public';
END;
$test$;

ROLLBACK;
