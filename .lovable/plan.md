# Go live: demo to production

Your app already connects to the real backend, but some demo-only parts remain. This plan removes them and hardens the app for real users.

## 1. Remove the demo layer
- Delete the in-browser demo backend and sample data.
- Remove the "Demo workspace" badge, "Reset demo data" menu item, and "Fill in demo credentials" hint on the login page.
- Restore the standard backend connection (no demo fallback).

## 2. Replace remaining sample data with real data
- Spatial pages (Floor Plans, Clash Analysis) and the 3D model hook: show real records or a clear empty state instead of built-in samples.
- Re-check Dashboard and AI Agents pages for any hard-coded numbers; wire to real data.

## 3. Account and access safety
- Turn email confirmation back on (new users verify their email before signing in).
- Stop granting admin to everyone; new signups stay "field staff", and you assign roles.
- Add a simple admin screen to change a user's role.
- Keep the breached-password check on.

## 4. Security and launch checks
- Run a security scan and fix critical findings.
- Confirm every data table has access rules.
- Set the real site title and description.
- Publish, then optionally connect a custom domain.

## Technical details
- Remove `src/lib/demo/*`, `src/test/demo-server.test.ts`, `IS_DEMO` references in `AppLayout`, `LoginPage`, `useBlenderData`; regenerate `src/integrations/supabase/client.ts` to the standard client.
- Auth config: `auto_confirm_email=false`; add `/reset-password` handling if missing.
- Migration: revert blanket admin grant; add admin-only `user_roles` management RLS via `has_role()`.
- Run linter + security scan; build and tests must pass before publishing.
