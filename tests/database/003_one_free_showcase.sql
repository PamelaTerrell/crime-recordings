BEGIN;

DO $test$
DECLARE
  first_case uuid := '11111111-1111-4111-8111-111111111111';
  second_case uuid := '22222222-2222-4222-8222-222222222222';
BEGIN
  INSERT INTO public.cases (id, slug, title)
  VALUES
    (first_case, 'local-test-showcase-one', 'Local Showcase One'),
    (second_case, 'local-test-showcase-two', 'Local Showcase Two');

  UPDATE public.cases
  SET recording_access_strategy = 'fully_free'
  WHERE id = first_case;

  BEGIN
    UPDATE public.cases
    SET recording_access_strategy = 'fully_free'
    WHERE id = second_case;

    RAISE EXCEPTION
      'FAIL: Database allowed two fully free showcase cases';

  EXCEPTION
    WHEN unique_violation THEN
      RAISE NOTICE
        'PASS: PostgreSQL rejected the second fully free showcase';
  END;

  IF (
    SELECT COUNT(*)
    FROM public.cases
    WHERE recording_access_strategy = 'fully_free'
  ) <> 1 THEN
    RAISE EXCEPTION
      'FAIL: Incorrect number of fully free showcase cases';
  END IF;

  RAISE NOTICE
    'PASS: Exactly one fully free showcase is permitted';
END;
$test$;

ROLLBACK;
