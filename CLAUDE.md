# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start Vite dev server at http://localhost:5173
npm run build    # Type-check + build to dist/
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

No test framework is configured.

## Environment

Copy `.env.example` to `.env` and fill in:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase public anon key

These are Vite build-time variables (embedded in the bundle at build). Docker passes them as build args.

## Architecture

**Stack:** React 19 + TypeScript (strict) + Vite, Tailwind CSS 4, Supabase (auth + PostgreSQL + storage), deployed as a Docker/Nginx static app.

### Routing & Auth

[src/App.tsx](src/App.tsx) defines all routes. `PrivateRoute` checks `supabase.auth.getSession()` and redirects unauthenticated users to `/login`. Routes: `/` (recorder), `/history`, `/admin`, `/login`, `/register`.

### Audio Recording Pipeline

The core logic lives in [src/hooks/useRecorder.ts](src/hooks/useRecorder.ts):

1. `getUserMedia()` → `AudioContext` + `AnalyserNode`
2. `requestAnimationFrame` loop computes RMS-based dB: `20 * log10(rms)`
3. Snore detection: threshold at 45 dB, debounced over 500ms
4. Noise log sampled at 1Hz: `{ timestamp, db }[]`
5. Canvas visualizer: green (<40 dB) / yellow (40–60) / red (>60)

`useAudioRecorder.ts` is an unused duplicate — prefer `useRecorder.ts`.

### Data Persistence

[src/lib/sessionManager.ts](src/lib/sessionManager.ts) saves completed sessions to Supabase:
- `sleep_sessions` table: start/end time, `noise_log` (JSONB), snore count, quality score
- Quality score formula: `max(0, min(100, 100 - (snores/hours * 5)))`
- `snore_events` table: individual events with audio path in `snore-clips` storage bucket

### Database Schema & RLS

[supabase/schema.sql](supabase/schema.sql) defines all tables and Row Level Security policies. All user data is isolated via `auth.uid()`. A trigger auto-creates a `profiles` row on signup. Storage uploads are validated so filenames must start with the user's UUID.

### Deployment

- **Docker:** Multi-stage build (Node 22 Alpine builder → Nginx Alpine runtime). Supabase env vars injected as build args.
- **docker-compose.yml:** Pulls from `ghcr.io/saintshen/snore:latest`, serves on port 7860.
- **CI/CD:** [.github/workflows/deploy-image.yml](.github/workflows/deploy-image.yml) builds and pushes to GHCR on push to `main`.

## Known Gaps (MVP)

- Admin dashboard is a stub (needs RLS policy updates)
- Snore detection threshold (45 dB) is uncalibrated
- History page is missing delete functionality
