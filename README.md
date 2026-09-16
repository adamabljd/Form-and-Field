# Form & Field

A full-stack hybrid calisthenics and football training app built with Next.js 15 App Router, TypeScript, Tailwind CSS, and Supabase SSR authentication.

## Run locally

1. Install Node.js 22+ and run `npm install`.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` to your application origin and enter your Supabase project URL and publishable key (project Connect dialog or Settings → API Keys). Never put a service-role key in a public environment variable.
3. Run `schema.sql` once in your existing project's Supabase SQL editor. It creates `ff_profiles`, `ff_exercises`, `ff_substitutions`, `ff_workout_plans`, and `ff_workout_logs`, plus prefixed indexes, the `ff_handle_new_user` function, and the `ff_on_profile_created` trigger scoped to `ff_profiles`. It also seeds 12 exercises and substitutions. It does not change existing app tables, auth triggers, or enroll existing users in bulk. If an `ff_` object already exists, the transaction fails instead of overwriting it. Do not run the earlier unprefixed SQL or rename tables belonging to another app.
4. In Supabase Authentication → URL Configuration, keep your existing Site URL and add `http://localhost:3000/auth/callback` to Redirect URLs. Add your production domain and its `/auth/callback` URL when deploying. Email/password authentication must be enabled. Authentication settings and email templates are shared across apps in a Supabase project; preserve settings required by your existing app. Confirmation templates must honor `{{ .ConfirmationURL }}` / the requested redirect, rather than hardcode the other app’s URL.
5. Run `npm run dev` and open http://localhost:3000.

The public `/` page is an explicitly labeled sample dashboard and works without Supabase credentials. `/login` displays a setup message until credentials are available. There is no authentication bypass for personal routes.

## Routes and behavior

- `/`: sample dashboard preview.
- `/login`: email/password sign-in and sign-up tabs, pending state, validation and readable errors. Sign-up supports both email confirmation and immediate sessions.
- `/auth/callback`: exchanges the PKCE code for a cookie session; next destinations are restricted to app routes. Open confirmation emails in the browser where sign-up began.
- `/auth/signout`: POST-only sign-out.
- `/dashboard`: database-backed weekly completed exercise counts, training days, preferences, and latest plan.
- `/workout`: starter session with explicit substitutions and authenticated server-action logging. Sets/reps represent uniform sets. A repeated save updates the existing exercise/date entry instead of inflating metrics.
- `/exercises`: searchable movement library with category and pattern filters.
- `/settings`: saves equipment, match days and fitness goal; includes mobile-accessible sign-out.

`middleware.ts` verifies sessions through Supabase `getUser()`, refreshes cookies, and protects `/dashboard`, `/workout`, `/settings`, `/exercises` and their descendants. Server pages/actions independently check authentication. Redirects preserve refreshed cookies. RLS enforces ownership independently of application checks. Private training reads are never statically generated.

The weekly calendar is a suggested template, with match days taking priority. It is not an adaptive coaching engine. The supplied schema does not contain plan-exercise associations, so the workout is a fixed starter session, with manual substitutions. Equipment and goal preferences are stored, and match days update the dashboard. No personalized periodization is implied. Exercise GIFs are nullable; add trusted HTTPS URLs in Supabase to expose movement links.

Dashboard sessions count distinct UTC log dates in the current UTC week; workout dates are selected explicitly in the user's browser. The preview's sample metrics are never used for authenticated accounts.

## Checks

```sh
npm run typecheck
npm run lint
npm run build
```

After connecting Supabase, test sign-up/confirmation/sign-in, reload a protected page, save settings and a workout log, then sign out and verify that direct access redirects to `/login`. With two accounts, verify that each can only select and mutate their own profiles/plans/logs; exercise-library writes should be denied. Live email and database checks require your Supabase project.

Auth implementation follows the [Supabase SSR documentation](https://supabase.com/docs/guides/auth/server-side/creating-a-client). Next.js 15 retains the requested `middleware.ts` convention.

## Sharing an existing Supabase project

Auth accounts remain shared in `auth.users`: an existing account can sign in with its current password. The app creates an `ff_profiles` row on the first authenticated visit using an insert-on-conflict-do-nothing operation. Its table-local trigger creates a starter plan atomically, so repeated visits preserve preferences and do not duplicate plans. Users who never open this app are not automatically enrolled. This is data namespacing, not a separate authentication tenant.

Only the prefixed migration should be applied. If you already applied the earlier version of this app’s SQL, stop and inspect which unprefixed objects belong to which app before migrating existing workout data. This migration deliberately does not rename, delete, or copy those objects.
