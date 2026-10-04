# Milestone 1 Implementation Plan

Goal: stabilize the existing MVP before adding classifier, concern-score, or real-admin features.

## 1. Fix quality gates

- Remove `any` casts in Supabase calls by introducing typed table row helpers or narrowing result shapes locally.
- Fix the React hook immutability warning in `useRecorder.ts`.
- Resolve hook dependency warnings in `Recorder.tsx` without creating render loops.
- Add CI or update the existing workflow so lint, tests, and build are required checks.

Completion criteria:

- `npm run lint` passes.
- `npm run test` passes.
- `npm run build` passes.

## 2. Align user-facing language with the glossary

- Change visible “session” language to **Recording** where it refers to the user-facing concept.
- Keep database names unchanged until the schema migration task begins.
- Update labels so threshold-derived detections are **Possible Snore Events**.

Completion criteria:

- Main flows use Recording language.
- No user-facing UI claims a heuristic event is a confirmed snore.

## 3. Add clip privacy controls

- Add a profile setting for default clip saving, initially off.
- Add a per-Recording override before recording starts.
- Ensure Recordings can be saved without clips.
- Make clip upload conditional on the effective setting.

Completion criteria:

- User can record with clips disabled.
- User can opt in for a Recording.
- History and detail views handle Recordings with no clips.

## 4. Add privacy copy

- Add in-app copy explaining cloud storage and clip sensitivity.
- Add copy explaining operator/admin metadata access.
- Add copy explaining the non-diagnostic boundary for future concern scoring.

Completion criteria:

- A user can understand what data is stored before recording.
- The app does not bury admin metadata access behind vague “metadata” wording.

## 5. Prepare schema migration design

- Draft a migration that creates `recordings` as the canonical table.
- Preserve existing IDs if migrating existing rows.
- Add a `sleep_sessions` compatibility view for old clients/tools until the next major version.
- Plan `snore_events.recording_id` migration while preserving read compatibility for `session_id` if needed.
- Keep storage object path shape `{userId}/{recordingId}/{eventId}.wav` and avoid object migration if IDs are preserved.

Completion criteria:

- Migration plan is reviewed before implementation.
- Existing clips remain addressable after migration.

## 6. Defer out-of-scope work

Do not implement in Milestone 1:

- Sleep Breathing Concern Score.
- Classifier-backed Snore Events.
- Real admin APIs.
- Clinician Report export.

These depend on the stabilized foundation above.
