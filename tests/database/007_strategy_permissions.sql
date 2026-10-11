-- Crime Recordings: database access-strategy permissions.
-- Tests effective PostgreSQL privileges, not RLS behavior.

DO $test$
BEGIN
  IF has_table_privilege('anon', 'public.cases', 'UPDATE')
     OR has_column_privilege(
       'anon', 'public.cases',
       'recording_access_strategy', 'UPDATE'
     ) THEN
    RAISE EXCEPTION 'FAIL: Anonymous users can update cases';
  END IF;

  RAISE NOTICE 'PASS: Anonymous case updates are prohibited';

  IF has_column_privilege(
    'authenticated', 'public.cases',
    'recording_access_strategy', 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'FAIL: Authenticated users can change strategies directly';
  END IF;

  IF has_function_privilege(
    'authenticated',
    'public.set_case_recording_access_strategy(uuid,text,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FAIL: Authenticated users can execute privileged RPC';
  END IF;

  RAISE NOTICE 'PASS: Authenticated users cannot bypass strategy permissions';

  IF NOT has_function_privilege(
    'service_role',
    'public.set_case_recording_access_strategy(uuid,text,uuid)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'FAIL: Service role cannot execute strategy RPC';
  END IF;

  RAISE NOTICE 'PASS: Service role can execute strategy RPC';
END;
$test$;
