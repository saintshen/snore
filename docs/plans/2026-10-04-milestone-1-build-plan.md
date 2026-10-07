# Milestone 1 Build Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Stabilize Snore’s current MVP so the recorder/history flow is shippable, privacy-aware, and aligned with the project glossary before adding classifier, concern-score, real-admin, or clinician-report features.

**Architecture:** Keep the existing React + Supabase MVP structure. Do not rename database tables in application code yet; use user-facing copy to say Recording while `sleep_sessions` remains the compatibility table until a reviewed migration lands. Centralize typed Supabase access and settings parsing so recorder, history, details, and admin screens stop using `any` casts and inconsistent terminology.

**Tech Stack:** React 19, TypeScript strict mode, Vite 7, Tailwind CSS 4, Vitest, Supabase Auth/Postgres/Storage, GitHub Actions, Docker/Nginx static deployment.

---

## Current Verified Baseline

Run from `/home/ming/Work/HSLabs/snore` on 2026-10-04:

- `npm run test`: passes, 8 files / 26 tests.
- `npm run build`: passes.
- `npm run lint`: fails with 14 errors and 2 warnings.

Main lint failures:

- `@typescript-eslint/no-explicit-any` in:
  - `src/components/Recorder.tsx`
  - `src/hooks/useRecorder.ts`
  - `src/lib/clipStore.ts`
  - `src/lib/sessionManager.ts`
  - `src/pages/Admin.tsx`
  - `src/pages/SessionDetail.tsx`
- React hook warnings/errors in:
  - `src/components/Recorder.tsx`
  - `src/hooks/useRecorder.ts`

---

## Non-Goals for This Plan

Do not implement these in Milestone 1:

- Classifier-backed Snore Events.
- Sleep Breathing Concern Score.
- Real cross-user admin APIs.
- Clinician Report export.
- Full `recordings` table migration implementation before the migration design is reviewed.

---

## Task 1: Add typed Supabase helpers for current tables

**Objective:** Remove repeated `as any` casts by exposing typed helpers and reusable table row aliases.

**Files:**

- Modify: `src/types/supabase.ts`
- Create: `src/lib/dbTypes.ts`
- Modify: `src/lib/supabase.ts`

**Steps:**

1. Inspect `src/lib/supabase.ts` and confirm it creates `createClient<Database>()`.
2. In `src/lib/dbTypes.ts`, export aliases:
   - `ProfileRow`
   - `ProfileSettings`
   - `SleepSessionRow`
   - `SleepSessionInsert`
   - `SleepSessionUpdate`
   - `SnoreEventRow`
   - `SnoreEventInsert`
3. Define `ProfileSettings` as a narrow object type for existing settings keys:
   - `sensitivity?: number`
   - `notify?: boolean`
   - `snoreThresholdDbfs?: number`
   - `saveClipsDefault?: boolean`
4. Update `src/types/supabase.ts` only if the generated/manual schema is missing fields required by existing code.
5. Run `npm run lint` and verify the helper itself introduces no errors.

**Verification:**

- `npm run lint` should still fail overall until later tasks, but `src/lib/dbTypes.ts` should have no lint errors.
- `npm run test` should still pass.

---

## Task 2: Remove Supabase `any` casts in session persistence

**Objective:** Type the session create/update path without changing behavior.

**Files:**

- Modify: `src/lib/sessionDraft.ts`
- Modify: `src/lib/sessionManager.ts`
- Test: `src/lib/sessionDraft.test.ts`

**Steps:**

1. Update `newSessionRecord()` return type to `SleepSessionInsert`.
2. Update `progressPatch()` and `finishedPatch()` return types to `SleepSessionUpdate`.
3. Remove `(supabase.from('sleep_sessions') as any)` from `sessionManager.ts`.
4. Keep existing error behavior: log then throw Supabase errors.
5. Run targeted tests: `npm run test -- src/lib/sessionDraft.test.ts`.
6. Run `npm run build` to catch Supabase type regressions.

**Verification:**

- No explicit `any` remains in `src/lib/sessionManager.ts`.
- Existing session draft tests pass.
- Build passes.

---

## Task 3: Remove Supabase `any` casts in clip upload/delete

**Objective:** Type snore event inserts and preserve storage rollback behavior.

**Files:**

- Modify: `src/lib/clipStore.ts`
- Test: `src/lib/snoreClips.test.ts`

**Steps:**

1. Type the insert payload as `SnoreEventInsert`.
2. Remove `(supabase.from('snore_events') as any)`.
3. Keep the existing rollback: if inserting `snore_events` fails after storage upload, remove the uploaded object.
4. Confirm `deleteSleepSession()` still deletes storage paths before the database row.
5. Run `npm run test -- src/lib/snoreClips.test.ts`.
6. Run `npm run build`.

**Verification:**

- No explicit `any` remains in `src/lib/clipStore.ts`.
- Clip path tests pass.
- Build passes.

---

## Task 4: Fix recorder hook lint errors without changing recorder behavior

**Objective:** Resolve React hook immutability/dependency warnings and explicit `any` use in `useRecorder.ts`.

**Files:**

- Modify: `src/hooks/useRecorder.ts`

**Steps:**

1. Replace `(window as any).webkitAudioContext` with a typed local window extension, e.g. `Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }`.
2. Change catch blocks from `catch (err: any)` to `catch (err: unknown)` and preserve current logging/copy.
3. Make `scheduleClip` and `emitClip` stable with `useCallback`, or intentionally move helper functions so `analyze` does not close over unstable functions.
4. Fix the React Hooks lint error around `requestAnimationFrame(analyze)` without restarting the analyzer loop unnecessarily. Preferred shape:
   - store the analyze callback in a ref, or
   - define an internal `tick` function that schedules itself through a ref.
5. Run `npm run lint`.
6. Run `npm run build`.

**Verification:**

- No lint error remains in `src/hooks/useRecorder.ts`.
- Recorder still compiles.
- Build passes.

---

## Task 5: Fix recorder component hook warning and settings typing

**Objective:** Remove `any` casts and make settings loading type-safe in `src/components/Recorder.tsx`.

**Files:**

- Modify: `src/components/Recorder.tsx`
- Modify: `src/lib/threshold.ts` if settings parsing needs type cleanup

**Steps:**

1. Replace `(supabase.from('profiles') as any)` with typed Supabase query usage.
2. Parse profile settings through existing `thresholdFromSettings()`.
3. Fix the waveform effect warning by making the refs stable in the dependency list or documenting/removing unnecessary dependencies in a lint-safe way.
4. Do not change the current recording lifecycle in this task.
5. Run `npm run lint`.
6. Run `npm run build`.

**Verification:**

- No explicit `any` remains in `src/components/Recorder.tsx`.
- Recorder UI still shows current dBFS and threshold.
- Build passes.

---

## Task 6: Rename user-facing “session/snores” copy to glossary language

**Objective:** Align visible MVP language with `GLOSSARY.md` without changing database names.

**Files:**

- Modify: `src/pages/Recorder.tsx`
- Modify: `src/components/Recorder.tsx`
- Modify: `src/pages/History.tsx`
- Modify: `src/pages/SessionDetail.tsx`
- Modify: `src/pages/Admin.tsx`

**Copy rules:**

- User-facing `Session` / `session` → `Recording` / `recording` where it refers to the product concept.
- `Snores` / `Snore clips` / threshold-derived snore count → `Possible Snore Events` or `Possible snore clips`.
- Keep source variable names like `sessionId` only where changing them would be a risky refactor.
- Keep database table names unchanged.

**Steps:**

1. Update navigation/header copy.
2. Update empty states.
3. Update delete confirmations and errors.
4. Update detail page titles and labels.
5. Update admin labels and note copy to clarify it is currently a personal operational view, not real cross-user admin.
6. Run `npm run lint` and `npm run build`.

**Verification:**

- Grep visible copy candidates with `rg "session|Session|Snores|snores|Snore clips" src` and manually confirm remaining hits are either internal code names or intentionally technical text.
- Build passes.

---

## Task 7: Add clip privacy settings model

**Objective:** Introduce typed settings for clip saving default, off by default.

**Files:**

- Modify: `src/lib/dbTypes.ts`
- Create: `src/lib/profileSettings.ts`
- Create: `src/lib/profileSettings.test.ts`
- Modify: `supabase/schema.sql`

**Steps:**

1. Create `profileSettings.ts` with pure helpers:
   - `profileSettingsFromJson(value: Json): ProfileSettings`
   - `clipSavingDefaultFromSettings(value: Json): boolean`
   - `withClipSavingDefault(value: Json, enabled: boolean): ProfileSettings`
2. Default `saveClipsDefault` to `false` when absent or invalid.
3. Preserve existing settings keys when writing new settings.
4. Add Vitest coverage for absent, invalid, false, true, and preservation cases.
5. Update `supabase/schema.sql` default settings JSON to include `"saveClipsDefault": false` while preserving current `sensitivity` and `notify` defaults.
6. Run `npm run test -- src/lib/profileSettings.test.ts`.

**Verification:**

- New tests pass.
- `npm run test` passes.
- Build passes.

---

## Task 8: Add per-Recording clip opt-in UI

**Objective:** Let users decide before recording whether clips are saved, defaulting to the profile setting and defaulting off for new users.

**Files:**

- Modify: `src/components/Recorder.tsx`
- Modify: `src/pages/Recorder.tsx` if page-level explanatory copy is cleaner there

**Steps:**

1. Load `saveClipsDefault` from profile settings alongside threshold.
2. Add a pre-start checkbox/toggle labeled clearly, for example: `Save possible snore audio clips for this Recording`.
3. Default unchecked when no profile setting exists.
4. Disable the toggle while recording.
5. Add nearby privacy copy: sleep audio may capture speech or private household sounds.
6. Gate `handleClip()` or `saveClip()` so clips are only uploaded when the effective per-Recording setting is true.
7. Keep metadata/noise log saving enabled even when clips are disabled.
8. Run `npm run lint`, `npm run test`, and `npm run build`.

**Verification:**

- With the toggle off, recordings still save metadata and possible event counts but no clips upload.
- With the toggle on, current clip upload behavior remains available.
- History detail page already handles no clips; confirm copy says no clips were saved for this Recording.

---

## Task 9: Add persistent global clip preference UI

**Objective:** Let users set the default clip-saving preference for future Recordings.

**Files:**

- Modify: `src/pages/Admin.tsx` or create a separate settings section if preferred
- Modify: `src/lib/profileSettings.ts`
- Test: `src/lib/profileSettings.test.ts`

**Steps:**

1. Add a settings panel distinct from the current threshold control.
2. Display `Save clips by default` with clear off-by-default privacy text.
3. On save, merge settings so `snoreThresholdDbfs` and unrelated keys are not dropped.
4. Reuse `withClipSavingDefault()`.
5. Consider renaming the page heading or note so the screen is not presented as real cross-user admin.
6. Run `npm run lint`, `npm run test`, and `npm run build`.

**Verification:**

- Saving clip default does not erase threshold setting.
- Saving threshold does not erase clip default.
- Build passes.

---

## Task 10: Add in-app privacy copy

**Objective:** Make cloud storage, clip sensitivity, delete behavior, and admin/operator metadata access visible inside the app.

**Files:**

- Create: `src/components/PrivacyNotice.tsx`
- Modify: `src/pages/Recorder.tsx`
- Modify: `src/pages/History.tsx` or `src/pages/SessionDetail.tsx`

**Steps:**

1. Create a reusable `PrivacyNotice` component with concise bullets:
   - Recordings and noise curves are stored in Supabase.
   - Clip saving is optional and may capture speech/private sounds.
   - Operators may access account and Recording metadata for support/operations.
   - The app is not diagnostic.
   - Deleting a Recording attempts to delete both metadata and clips.
2. Place the notice where a user sees it before starting a Recording.
3. Add shorter delete expectation copy near delete actions or confirmation text.
4. Run `npm run lint` and `npm run build`.

**Verification:**

- Privacy statements match `docs/privacy.md`.
- No UI claims medical diagnosis or confirmed snoring.

---

## Task 11: Make CI enforce lint, tests, and build

**Objective:** Ensure Milestone 1 quality gates run before Docker image publishing.

**Files:**

- Modify: `.github/workflows/deploy-image.yml`

**Steps:**

1. Add a `quality-gates` job before Docker build:
   - checkout
   - setup Node 22
   - `npm ci`
   - `npm run lint`
   - `npm run test`
   - `npm run build`
2. Make `build-and-push-image` depend on `quality-gates` with `needs: quality-gates`.
3. Keep Docker build/push behavior unchanged.
4. Run local gates: `npm run lint && npm run test && npm run build`.

**Verification:**

- Workflow YAML is valid.
- Docker job does not run unless quality gates pass.

---

## Task 12: Draft schema migration design for `recordings`

**Objective:** Produce a reviewed migration plan before implementing the table rename.

**Files:**

- Create: `docs/adr/0003-recordings-migration.md`
- Optionally create: `supabase/migrations/draft-recordings-migration.sql` only as a non-applied draft if desired

**Required design decisions:**

1. `recordings` becomes canonical table.
2. Existing `sleep_sessions.id` values are preserved.
3. `sleep_sessions` remains as a compatibility view for old app code/tools during transition.
4. `snore_events.recording_id` is introduced while preserving compatibility for `session_id` reads if needed.
5. Storage path shape remains `{userId}/{recordingId}/{eventId}.wav`.
6. RLS policy semantics remain user-isolated by `auth.uid()`.
7. Rollback plan is documented.

**Verification:**

- ADR explicitly states no object migration is needed if IDs are preserved.
- ADR documents the risk if IDs change.
- No app code is switched to `recordings` until this ADR is reviewed.

---

## Final Milestone Verification

Run from repo root:

```bash
npm run lint
npm run test
npm run build
```

Expected final state:

- Lint passes with no errors.
- Vitest passes.
- Vite production build passes.
- User-facing copy uses Recording / Possible Snore Event language.
- Clip saving defaults off and has a per-Recording override.
- Privacy copy is visible before recording.
- CI enforces lint, tests, and build before publishing the Docker image.
- `recordings` migration design exists but is not implemented until reviewed.

---

## Suggested Implementation Order

1. Tasks 1-5: restore code quality gates.
2. Task 6: terminology cleanup.
3. Tasks 7-9: clip privacy controls.
4. Task 10: privacy copy.
5. Task 11: CI enforcement.
6. Task 12: migration design.

Commit after each task with focused messages, for example:

- `chore: add typed database aliases`
- `fix: remove untyped session persistence casts`
- `fix: stabilize recorder hook lint behavior`
- `copy: align recording terminology`
- `feat: add clip saving privacy controls`
- `ci: enforce quality gates before image publish`
- `docs: design recordings migration`
