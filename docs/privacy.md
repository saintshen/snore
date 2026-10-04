# Privacy Model

Snore is cloud-first: Recordings and selected audio clips are stored in Supabase so users can review history across sessions and devices. This makes privacy part of the product, not a later polish task.

## Data Stored

The app may store:

- Account identity needed for authentication.
- Recording start time, end time, duration, and created time.
- Noise logs used to draw level curves.
- Possible Snore Event or Snore Event counts and metadata.
- Sleep Breathing Concern Score bands and questionnaire answers.
- User-selected audio clips.

## Clip Saving

Clip saving should be controlled by a global setting that defaults off, with a per-Recording override before recording starts. A Recording without clips should still produce metadata, charts, and trends.

When clips are saved, the UI should explain that sleep audio may capture speech or other private household sounds. Clip inclusion in exports or Clinician Reports must be explicit.

## Admin Access

Admins are app operators with privileged access through server-side APIs. Privacy copy should explicitly say that operators may access:

- Account metadata such as email and account creation date.
- Recording metadata such as start/end time and duration.
- Snore or Possible Snore Event counts.
- Sleep Breathing Concern Score values.
- Noise log curves.
- Clip metadata such as timestamp, duration, and peak level.

Admins should not access raw audio clips by default. Any future audio access should require an explicit user grant and should be recorded in the Admin Audit Log.

## Audit Logs

The Admin Audit Log should record all admin reads of user-level data and all admin mutations. Aggregate dashboard reads do not need the same treatment unless they target a specific user.

Audit logs are internal for the first admin release, but the system should be designed so user-visible access history can be added later.

## Deletion Expectations

Deleting a Recording should delete its metadata and associated clips. If clip deletion fails, the app should keep the Recording visible and tell the user that deletion did not complete, rather than hiding metadata while leaving audio behind.

## Health-Adjacent Copy

The Sleep Breathing Concern Score is not a diagnosis. High concern should prompt wording like “consider discussing this with a clinician” and may offer a Clinician Report. The product should not recommend treatments such as CPAP, mouth tape, or positional therapy.
