# Snore Project Context

Welcome to the **Snore** project. This is a sleep recording and snore detection application built with React, TypeScript, and Supabase.

## Project Overview

- **Purpose**: A web-based tool for users to record their sleep, monitor noise levels, and detect snore events using browser-based audio processing.
- **Frontend Stack**: 
  - **React 19** (Functional components, Hooks)
  - **Vite 7** (Build tool)
  - **TypeScript** (Strict mode)
  - **Tailwind CSS 4** (Styling)
  - **TanStack Query (React Query) v5** (Data fetching and state management)
  - **React Router DOM v7** (Routing)
  - **Lucide React** (Icons)
- **Backend Stack**:
  - **Supabase** (Authentication, PostgreSQL Database with RLS, Storage for audio clips)
- **Deployment**:
  - **Docker** (Multi-stage build with Nginx)
  - **GitHub Actions** (CI/CD for building and pushing Docker images)

## Core Architecture & Key Logic

### Audio Recording Pipeline (`src/hooks/useRecorder.ts`)
- Uses `getUserMedia()` to access the microphone.
- Processes audio via `AudioContext` and `AnalyserNode`.
- Calculates dB levels using RMS: `20 * log10(rms)`.
- **Snore Detection**: Threshold set at 45 dB, debounced over 500ms.
- **Visualization**: A canvas-based visualizer colored by dB (Green <40, Yellow 40-60, Red >60).

### Data Persistence (`src/lib/sessionManager.ts`)
- Saves sessions to `sleep_sessions` table in Supabase.
- Stores `noise_log` as JSONB (sampled at 1Hz).
- Uploads snore clips to `snore-clips` storage bucket.
- Calculates a "Sleep Quality Score" based on snores per hour.

### Routing & Auth (`src/App.tsx`)
- Defines routes: `/` (Recorder), `/history`, `/admin`, `/login`, `/register`.
- `PrivateRoute` component handles session checking via `supabase.auth.getSession()`.

## Development Commands

- `npm run dev`: Starts the Vite development server at http://localhost:5173.
- `npm run build`: Type-checks and builds the project for production (dist/).
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Runs ESLint for code quality checks.

## Development Conventions

- **Type Safety**: Strictly typed components and hooks. Avoid `any`.
- **Components**: Functional components with hooks only. Use `React.FC` or explicit prop types.
- **Data Fetching**: Always use `useQuery` and `useMutation` from TanStack Query for server operations.
- **Styling**: Standard Tailwind utility classes. Use `clsx` or `tailwind-merge` for dynamic classes if needed.
- **Auth**: Use the Supabase client for all authentication and database interactions.

## Environment Setup

Requires a `.env` file with:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Refer to `.env.example` for the structure.

## Notable Files

- `CLAUDE.md`: Specific guidance for Claude-based AI interactions.
- `.agent/rules/dev-guide.md`: Detailed coding guidelines and examples.
- `supabase/schema.sql`: Database schema, RLS policies, and triggers.

## Communication & Language Preferences

- The user prefers to provide prompts in Chinese.
- **Agent MUST respond in English.**
- **All file modifications, comments, and documentation MUST be written in English.**
