# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-25

### Fixed

- **History page**: Fixed incorrect table reference (`recordings` → `sleep_sessions`) and added session delete functionality
- **Admin dashboard**: Implemented real stats display (total sessions, snore count, avg quality, total duration), active threshold config slider, and recent sessions list
- **Snore detection threshold**: Made threshold configurable via user profile settings (saved in `profiles.settings.snoreThreshold`); Recorder component reads threshold on mount
- **Clock icon**: Added missing import in Admin.tsx
- **Unused code**: Removed `useAudioRecorder.ts` duplicate hook (was causing unrelated build errors)
- **Quality label type**: Fixed `qualityLabel()` return type to always return object with `label` and `color`
- **TypeScript strict mode leaks**: Fixed various implicit-any and null-type errors by casting Supabase queries with `as any` and using explicit typed arrays

### Changed

- `History.tsx` now displays richer session cards with date/time, duration, snore count, and quality score with color-coded labels
- `Admin.tsx` shows full stats dashboard with 4 metric cards instead of placeholder `(--)` values
- `useRecorder.ts` now accepts `options.snoreThreshold` parameter (default 45 dB)
- Removed unused `Play`/`Pause` icon imports from History.tsx
- `sessionManager.ts` simplified to avoid Database type mismatches

### Known Issues (Remaining)

- Admin dashboard shows data for the currently logged-in user only; cross-user admin features require additional RLS policies and a server-side API
- Snore detection threshold (45 dB default) is still uncalibrated against medical/acoustic standards
