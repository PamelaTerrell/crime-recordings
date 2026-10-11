# Crime Recordings — Concurrency Test Findings

## Confirmed defect

The initial recording-access enforcement migration can cause a
PostgreSQL deadlock during overlapping recording edits and
case-strategy changes.

## Reproduction

Connection A:
1. Begins a transaction.
2. Locks a recording row with SELECT ... FOR UPDATE.
3. Waits briefly.
4. Updates the recording's access_level column.

Connection B:
1. Begins a separate transaction.
2. Calls set_case_recording_access_strategy() for the same case.

## Observed result

PostgreSQL returned:

ERROR: deadlock detected

## Root cause

The showcase-switching function acquires a transaction advisory lock
before updating recording rows.

The recording-access trigger acquires the same advisory lock after
the recording row may already be locked.

These operations can therefore acquire locks in opposite orders.

## Required correction

Redesign the concurrency strategy and verify that all affected
operations follow a compatible locking order.

Do not deploy the existing recording-access migrations until the
concurrency issue has been corrected and retested.

## Environment

- Local Supabase CLI 2.120.0
- PostgreSQL 17.11
- OrbStack / Docker on Apple silicon
- Isolated Crime Recordings schema
