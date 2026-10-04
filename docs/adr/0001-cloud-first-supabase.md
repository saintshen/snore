# Cloud-first storage with Supabase

Snore will store Recording metadata and user-selected clips in Supabase so users can keep sleep-noise history across sessions and devices. This is a deliberate cloud-first choice rather than a local-only recorder, so privacy controls, deletion behavior, and clear disclosure are product requirements rather than optional polish.

## Considered Options

- Local-only storage: stronger privacy posture, but weaker history portability and harder multi-device use.
- Cloud-first Supabase storage: matches the current architecture and enables history, admin operations, and later sharing features.
- Hybrid local-first sync: attractive long term, but too large a foundation change for the current MVP.

## Consequences

- Clip saving must be user-controlled and default off until the user opts in.
- Admin/operator metadata access must be disclosed.
- Deletion must account for both database rows and storage objects.
- Health-adjacent features must avoid overclaiming because sensitive data is stored in the cloud.
