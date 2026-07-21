## Likely cause (unconfirmed until I run auth checks in build mode)

The signup UI already says "you can sign in now", but the backend most likely still requires email confirmation. Result: `signUp` succeeds → user tries to sign in → GoTrue returns `email_not_confirmed` / "Invalid login credentials" → toast shows a failure. This matches earlier turns where auto-confirm was requested but may have regressed.

A second, less likely cause is the auth email rate limit (HTTP 429 `over_email_send_rate_limit`) blocking new signups entirely.

## Plan

1. **Verify current auth config** — read project auth settings and confirm whether `auto_confirm_email` is on and what the email rate limit is.
2. **Enable auto-confirm** via `supabase--configure_auth` with `auto_confirm_email: true`, `disable_signup: false`, `external_anonymous_users_enabled: false`, `password_hibp_enabled: true` (keep leaked-password protection on). This lets new users sign in immediately with no email step.
3. **If rate-limited**, bump `rate_limit_email_sent` to 100/hr.
4. **Improve `LoginPage.tsx` error clarity**:
   - After `signUp` succeeds, auto-call `signIn(email, password)` so a successful signup drops the user straight into the app (no manual re-entry, no "did it work?" ambiguity).
   - Map common GoTrue errors to friendlier toasts: `email_not_confirmed` → "Check your inbox to confirm your email", `invalid_credentials` → "Wrong email or password", `over_email_send_rate_limit` → "Too many attempts — try again shortly", `user_already_registered` → "That email is already registered — sign in instead".
5. **End-to-end verify with Playwright**: navigate to `/login`, click Sign up, submit a fresh random email + password, confirm the app lands on `/` (Dashboard) with no error toast. Screenshot the result.
6. Report back with the observed final URL and screenshot.

## Technical notes

- No schema changes. No new tables. No new RLS.
- `handle_new_user` trigger already auto-creates a `profiles` row and a `user_roles` row (`field_staff`) on signup — no action needed.
- File touched: `src/pages/auth/LoginPage.tsx` only.
- Auth setting changes are made via `supabase--configure_auth` (server-side), not via code.

## Out of scope

- Google / social login (can add later if wanted).
- Custom-branded auth email templates.
- Changing default role from `field_staff` on new signups.
