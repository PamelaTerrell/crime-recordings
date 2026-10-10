-- Crime Recordings database integration test.
-- Verify that the required baseline schema is installed.

DO $test$
BEGIN
  IF to_regclass('public.cases') IS NULL THEN
    RAISE EXCEPTION 'FAIL: cases table is missing';
  END IF;

  IF to_regclass('public.recordings') IS NULL THEN
    RAISE EXCEPTION 'FAIL: recordings table is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'recording_access'
      AND e.enumlabel = 'public'
  ) THEN
    RAISE EXCEPTION 'FAIL: public recording access is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'recording_access'
      AND e.enumlabel = 'member'
  ) THEN
    RAISE EXCEPTION 'FAIL: member recording access is missing';
  END IF;

  RAISE NOTICE 'PASS: Crime Recordings baseline schema verified';
END;
$test$;
