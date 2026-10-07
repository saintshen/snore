# Canonical `recordings` table migration

The product language is now **Recording**, but the current database still uses `sleep_sessions` as the table name and `snore_events.session_id` as the clip foreign key. We will migrate the schema so `recordings` becomes canonical while preserving IDs, storage paths, RLS semantics, and compatibility for old app code during the transition.

## Decision

Create a canonical `recordings` table that carries the current `sleep_sessions` data model and preserves every existing `sleep_sessions.id` value. During the transition, keep `sleep_sessions` as a compatibility view over `recordings` so older code, support queries, and typed clients can continue to read and write through the old name until all consumers move.

Introduce `snore_events.recording_id` as the canonical foreign key to `recordings(id)`. Keep `snore_events.session_id` available for compatibility reads during the transition, either as a real synchronized column or as part of a compatibility view, depending on the final migration mechanics reviewed before implementation.

Storage object paths remain unchanged in shape: `{userId}/{recordingId}/{eventId}.wav`. Because `recordingId` is the preserved former `sleep_sessions.id`, no storage object migration is needed.

## Required migration properties

1. `recordings` becomes the canonical table name.
2. Existing `sleep_sessions.id` values are preserved exactly as `recordings.id`.
3. `sleep_sessions` remains available as a compatibility view during the rollout.
4. `snore_events.recording_id` is introduced while preserving compatibility for `session_id` reads if needed.
5. Storage paths remain `{userId}/{recordingId}/{eventId}.wav`.
6. RLS policy semantics remain user-isolated by `auth.uid() = user_id`.
7. Rollback is possible without changing object storage paths.

## Migration outline

A reviewed SQL migration should follow this order:

1. Create `recordings` with the same columns, defaults, constraints, indexes, and RLS policies as `sleep_sessions`.
2. Copy data from `sleep_sessions` into `recordings`, preserving `id`, `user_id`, timestamps, `noise_log`, possible event counts, quality score, and `created_at`.
3. Add `snore_events.recording_id uuid` and backfill it from `snore_events.session_id`.
4. Add a foreign key from `snore_events.recording_id` to `recordings(id)`.
5. Ensure new writes populate `recording_id` before application code switches to the new column. If compatibility writes through `session_id` must remain supported, add a trigger or updatable compatibility view to synchronize `session_id` and `recording_id`.
6. Replace `sleep_sessions` table access with a compatibility view named `sleep_sessions` over `recordings`, preserving the old column names and shape for legacy readers.
7. Keep RLS enabled on `recordings`; policies should match the old user isolation model:
   - select where `auth.uid() = user_id`
   - insert with check `auth.uid() = user_id`
   - update where `auth.uid() = user_id`
   - delete where `auth.uid() = user_id`
8. Update generated Supabase types and app code in a separate reviewed change after this ADR is accepted.

## Storage impact

No object migration is needed if IDs are preserved. Existing clips already live under a path keyed by user ID and the Recording ID, even though that ID is currently named `session_id` in code and database columns.

If IDs change, every existing `snore_events.audio_path` and every storage object path would become inconsistent with the new database rows. That would require a storage object copy/rename migration, path rewrite, and rollback strategy for partially moved audio objects. This is unnecessary risk, so ID preservation is mandatory.

## Compatibility period

During compatibility:

- Existing app code may continue reading `sleep_sessions`.
- New app code should move to `recordings` only after generated types, query helpers, tests, and RLS checks are updated together.
- `snore_events.session_id` should remain readable until all detail, delete, export, and support tools use `recording_id`.
- Support or analytics queries should treat `recordings` as source of truth and `sleep_sessions` as legacy compatibility.

No app code should be switched to `recordings` until the migration SQL and generated types are reviewed.

## Rollback plan

Because IDs and storage paths are preserved, rollback can avoid object storage changes.

If rollback is needed before dropping legacy compatibility:

1. Stop application deploys that write only to `recordings` or `recording_id`.
2. Recreate or restore the `sleep_sessions` table from `recordings`, preserving IDs and timestamps.
3. Backfill or restore `snore_events.session_id` from `snore_events.recording_id`.
4. Restore the previous RLS policies on `sleep_sessions` and `snore_events`.
5. Redeploy app code that uses `sleep_sessions` and `session_id`.

Do not drop `sleep_sessions` compatibility or `snore_events.session_id` until production reads and writes have been observed using only `recordings` and `recording_id` for at least one release window.

## Consequences

- The schema aligns with the user-facing Recording language without breaking old clients immediately.
- Preserved IDs keep clip storage paths stable and avoid audio object migration.
- The transition requires a temporary compatibility layer and careful Supabase type regeneration.
- RLS behavior remains unchanged: users can only access their own Recordings and clips.
