# Snore Roadmap

Snore is a cloud-first personal sleep tracking product that helps users understand snoring patterns and decide when to discuss sleep-breathing concerns with a clinician. The product must stay honest about uncertainty: until classifier-based detection is validated, the app should present amplitude-derived events as Possible Snore Events.

## Product Direction

1. **Personal tracking first**: the primary user is tracking their own sleep noise over time.
2. **Health-adjacent, not diagnostic**: the app may present a Sleep Breathing Concern Score, but it must explain that the score is not a diagnosis.
3. **Cloud-first history**: Recordings, summaries, and user-selected clips sync through Supabase.
4. **Classifier direction**: the target detection model is classifier-based, staged from rule-based features toward local ML if needed.
5. **Real admin**: app operators need cross-user operational visibility through privileged server-side APIs, not browser-side service credentials.

## Milestones

### Milestone 1: Stabilize the current MVP

Goal: make the existing recorder/history product shippable, honest, and maintainable before expanding detection.

Acceptance criteria:

- `npm run lint`, `npm run test`, and `npm run build` pass in CI.
- User-facing language says **Recording** instead of session/night where appropriate.
- The UI distinguishes **Possible Snore Events** from classifier-backed Snore Events.
- Clip saving is governed by a global privacy setting defaulting off, with a per-Recording override.
- Privacy copy explains cloud storage, operator metadata access, clip behavior, and delete expectations.
- A first implementation plan exists for schema migration toward `recordings` with a `sleep_sessions` compatibility view.

### Milestone 2: Detection foundation

Goal: reduce false positives and prepare for classifier-backed detection without overclaiming.

Acceptance criteria:

- The app extracts rule-based features beyond amplitude: duration, peak, event spacing, and candidate spectral features.
- Detection results expose confidence language: possible/likely, never confirmed.
- Users can review events and optionally give feedback that can later support evaluation.
- The threshold slider is demoted behind presets or advanced settings.

### Milestone 3: Sleep Breathing Concern Score

Goal: introduce a non-diagnostic Low/Moderate/High concern band anchored in established screening-style questions.

Acceptance criteria:

- The score is based primarily on questionnaire answers inspired by established sleep-breathing screening structures.
- Recording data is used only as supporting context until detection is validated.
- High concern leads to “consider discussing this with a clinician” and a Clinician Report, not treatment recommendations.
- The UI avoids numeric precision and avoids calling the score a diagnosis or medical result.

### Milestone 4: Real admin

Goal: support app operations without exposing service-role credentials or unnecessary audio access.

Acceptance criteria:

- Supabase Edge Functions implement admin APIs.
- `admin_users` is the source of truth for admin authorization.
- Admins can see account fields, Recording start/end/duration, snore counts, concern score, noise curves, and clip metadata.
- Admins cannot access raw audio by default.
- Admin reads of user-level data and all admin mutations write to Admin Audit Log.

### Milestone 5: Clinician sharing and exports

Goal: help users bring useful context to a professional conversation.

Acceptance criteria:

- First report format is a summarized PDF without clips.
- Later exports may include ZIP, CSV/JSON, selected audio clips, and expiring share links.
- Clip inclusion is explicit per export.

## Open Implementation Risks

- The database rename from `sleep_sessions` to `recordings` should preserve IDs so existing storage paths remain readable.
- If IDs change during migration, storage lookup fallback or object migration becomes mandatory.
- Health-adjacent scoring requires careful copy review before release.
- Admin metadata access is sensitive even without audio and must be reflected in privacy copy.
