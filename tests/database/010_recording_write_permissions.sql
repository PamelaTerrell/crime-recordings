-- Crime Recordings: expected permissions after coordinated writes.
-- Run only after the new write functions and grants are installed.

DO $test$
BEGIN
  IF has_column_privilege(
    'authenticated', 'public.recordings', 'access_level', 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'FAIL: Direct access-level updates remain allowed';
  END IF;

  IF has_column_privilege(
    'authenticated', 'public.recordings', 'is_published', 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'FAIL: Direct publication updates remain allowed';
  END IF;

  IF has_column_privilege(
    'authenticated', 'public.recordings', 'case_id', 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'FAIL: Direct case transfers remain allowed';
  END IF;

  IF NOT has_column_privilege(
    'authenticated', 'public.recordings', 'title', 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'FAIL: Ordinary metadata editing was disabled';
  END IF;

  RAISE NOTICE 'PASS: Sensitive recording writes require controlled operations';
END;
$test$;
