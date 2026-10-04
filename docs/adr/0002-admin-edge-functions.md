# Real admin APIs use Supabase Edge Functions

Real admin features will be implemented through Supabase Edge Functions rather than browser-side queries or embedded service credentials. Admin authorization will be checked against an `admin_users` table, and user-targeted admin reads plus all admin mutations will be written to an Admin Audit Log.

## Considered Options

- Browser-only admin with RLS/custom claims: simpler UI, but insufficient for privileged cross-user operations and risky if it encourages broad client access.
- Separate Node backend: flexible, but larger operational footprint than the current Supabase architecture needs.
- Supabase Edge Functions: smallest server-side step from the current stack and keeps privileged credentials out of the browser.

## Consequences

- The app needs an explicit `admin_users` authorization model.
- Admin APIs must avoid raw audio access by default.
- Admin reads of user-level data are privacy-relevant and should be audited.
- Aggregate dashboards can be less restricted than user-targeted reads, but must not leak raw audio or unnecessary personal detail.
