-- Crime Recordings: test the centralized recording-access policy.

DO $test$
DECLARE
  selected_id uuid := '11111111-1111-4111-8111-111111111111';
  other_id uuid := '22222222-2222-4222-8222-222222222222';
BEGIN
  IF private.effective_recording_access(
    'fully_free', NULL, other_id, true
  ) <> 'public' THEN
    RAISE EXCEPTION 'FAIL: Published showcase recording';
  END IF;

  IF private.effective_recording_access(
    'fully_free', NULL, other_id, false
  ) <> 'member' THEN
    RAISE EXCEPTION 'FAIL: Unpublished showcase recording';
  END IF;

  IF private.effective_recording_access(
    'free_sample', selected_id, selected_id, true
  ) <> 'public' THEN
    RAISE EXCEPTION 'FAIL: Selected free recording';
  END IF;

  IF private.effective_recording_access(
    'free_sample', selected_id, other_id, true
  ) <> 'member' THEN
    RAISE EXCEPTION 'FAIL: Non-selected recording';
  END IF;

  IF private.effective_recording_access(
    'free_sample', selected_id, selected_id, false
  ) <> 'member' THEN
    RAISE EXCEPTION 'FAIL: Unpublished free sample';
  END IF;

  IF private.effective_recording_access(
    'members_only', NULL, other_id, true
  ) <> 'member' THEN
    RAISE EXCEPTION 'FAIL: Members-only recording';
  END IF;

  RAISE NOTICE 'PASS: All six recording-access decisions are correct';
END;
$test$;
