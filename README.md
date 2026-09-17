# Form & Field

A full-stack hybrid calisthenics and football training app built with Next.js 15 App Router, TypeScript, Tailwind CSS, and Supabase SSR authentication.

## Run locally

1. Install Node.js 22+ and run `npm install`.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SITE_URL` to your application origin and enter your Supabase project URL and publishable key (project Connect dialog or Settings → API Keys). Never put a service-role key in a public environment variable.
3. Run `schema.sql` once in your existing project's Supabase SQL editor. It creates `ff_profiles`, `ff_exercises`, `ff_substitutions`, `ff_workout_plans`, and `ff_workout_logs`, plus prefixed indexes, the `ff_handle_new_user` function, and the `ff_on_profile_created` trigger scoped to `ff_profiles`. Exercise data is populated separately with `npm run db:seed`; the migration contains no starter exercises or substitutions. It does not change existing app tables, auth triggers, or enroll existing users in bulk. If an `ff_` object already exists, the transaction fails instead of overwriting it. Do not run the earlier unprefixed SQL or rename tables belonging to another app.
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

## Import the full exercise library

The standalone TypeScript seeder fetches the [free-exercise-db dataset](https://github.com/yuhonas/free-exercise-db) and upserts into this app's **`ff_exercises`** table, not another app's unprefixed `exercises` table. Apply `schema.sql` first. Node.js 22+ is required; `.env.local` is loaded automatically, with existing shell environment values taking precedence.

Preview the mapping without database credentials or writes:

```sh
npm run db:seed -- --dry-run
```

To actually populate the database, add `SUPABASE_SECRET_KEY=sb_secret_...` to your ignored `.env.local` (or use the legacy `SUPABASE_SERVICE_ROLE_KEY`). The normal app still only needs the publishable key; seeding requires elevated database write access. Never use `NEXT_PUBLIC_` for a secret and never commit it. `NEXT_PUBLIC_SUPABASE_URL` is reused, or you can supply `SUPABASE_URL` for the seed process.

```sh
npm run db:seed
```

The script validates the complete dataset before writes, assigns stable UUIDs, preserves existing IDs by normalized name, and upserts batches of 100. Run one seeder at a time. Re-running updates matching records without duplicating them or deleting user data. Existing duplicate normalized names cause a clear error before writes. Batches are individually committed; a failed run can be resumed by rerunning the command.

All eight requested home exercises are included, with custom defaults taking precedence. Existing image URLs are retained when the seed has none. `gif_url` contains the dataset's first image URL, generally a **JPG**, not an animated GIF. Custom exercises without an exact matching dataset image keep a null image rather than an unrelated demonstration.

Equipment is stored as a text array (`body only` becomes `[]`). Difficulty maps beginner/intermediate/expert to 1/3/5. Movement tagging prioritizes named movement mechanics, then primary muscle and push/pull force. The schema has no isolation, stretching, or cardio patterns, so those records receive the closest available category; these are heuristic tags, not individually reviewed coaching classifications.

Run the mapping checks with `npx tsx --test scripts/seed-exercises.test.ts`.

## Workout engine APIs

For an **existing database**, apply `supabase/migrations/202609170001_workout_engine.sql` once in the Supabase SQL editor. It adds a nullable, validated `program` JSONB column to `ff_workout_plans`; existing plans remain valid. Fresh databases created from the updated `schema.sql` already include this column and constraint, so do not apply both. Existing owner-based RLS policies also protect generated plans. Seed the exercise library before generating programs.

Both routes accept authenticated, same-origin JSON POST requests using the signed-in user's Supabase cookies. Neither accepts a client-supplied owner ID nor uses an admin key. They return JSON errors (400 invalid input, 401 unauthenticated, 404 missing exercise, 413 oversized body, 415 wrong content type, 422 impossible program, 503 database unavailable).

### Generate a plan

`POST /api/generate-plan`

```json
{
  "equipment": ["Pull-up bar", "Dip bars", "20kg Barbell", "Small Bands", "Push-up Grips"],
  "match_days": ["Saturday"],
  "week_number": 1
}
```

Returns HTTP 201 with `{ "plan": { "id", "name", "week_number", "created_at", "program" } }`. The saved `program` contains equipment and matchday snapshots plus four sessions with exercise IDs, sets, reps, rest intervals, and per-side flags. Week number is optional (defaults to 1). Equipment and match_days are required arrays, including empty arrays when appropriate. Each successful request creates a new plan.

Two sessions train upper-body push/pull; two prioritize plyometrics, single-leg knee-dominant and hinge movements, plus core. Scheduling avoids matches and lower-body work the day before matches, maintains at least one day between sessions of the same focus, and accounts for Sunday/Monday adjacency. Impossible schedules and insufficient compatible exercises return 422 rather than inventing exercises or required equipment. Recovery warnings are included when lower-body training must follow a match. This is a deterministic template, not personalized injury or fatigue management.

### Suggest an exercise swap

`POST /api/swap-exercise`

```json
{
  "current_exercise_id": "EXISTING-EXERCISE-UUID",
  "reason": "too_hard",
  "current_reps": 8
}
```

Reasons: `too_hard`, `too_easy`, `joint_soreness`, `missing_equipment`; reason is optional, and current_reps defaults to 8. Equipment comes from the user's latest generated plan, falling back to profile equipment when no generated plan exists. This endpoint returns suggestions only; it does not change a saved plan or log.

Returns `{ "current_exercise_id", "candidates" }`, with up to three compatible exercises and `target_sets`/`target_reps`. Fewer candidates (including zero) are allowed when there are not enough valid matches. Easier and harder reasons enforce the corresponding difficulty direction. Rep targets use a bounded difficulty-ratio heuristic; plyometric repetitions are capped separately. Soreness requests require lower difficulty and do not increase repetition targets, but the schema has no joint-specific safety information, so the response includes an explicit limitation.

The same-pattern rule is strict: Dips (vertical push) will not be replaced with Push-ups (horizontal push). Equipment aliases support Dip bars/Parallel bars, Small Bands/Resistance bands, and Push-up Grips/Parallettes. A 20kg barbell satisfies a generic barbell requirement; a generic barbell does not imply a 20kg barbell. Generated plans are available in the live workout view at `/workout/[id]`; `/workout` links to the most recent generated plans.


## Live workout logging

Existing databases: apply `supabase/migrations/202609170002_live_workout.sql` **after** the workout-engine migration. This adds per-set context to `ff_workout_logs`, preserves old aggregate records, updates uniqueness rules, and enforces plan ownership through a restrictive RLS policy. Fresh installations use `schema.sql`, which already includes both migrations; do not apply the same migrations again. Run neither the schema nor migrations through a browser client.

Open `/workout/<generated-plan-id>?day=0`. `day` is the zero-based index of the generated plan's four sessions. The client adds `date=YYYY-MM-DD` using the browser's local date, fixing the session date even if it continues past midnight. Different days and dates have separate set progress. The route only loads plans belonging to the signed-in user; older plans without program JSON show a link back to workouts.

- Set checkboxes optimistically call `POST /api/workout-set`. Each row represents one set (`sets=1`) with `plan_id`, `session_day`, `slot_index`, `set_index`, `target_sets`, and date. Repeated saves update the same row. Unchecking saves `completed=false`. Failed requests roll back the checkbox and display a retry message. No offline-save success is implied.
- Completed sets and their exercise choices reload from Supabase. A swapped slot with no completed sets is remembered in sessionStorage for that browser tab; swaps do not modify the original weekly plan. Once sets are completed, undo them before swapping the slot to preserve exercise attribution.
- The swap modal calls `/api/swap-exercise` with the current `plan_id`, exercise ID, reps, and selected reason. That API verifies plan ownership and uses that plan's equipment snapshot instead of a different, newer plan. Candidates show their images and adjusted targets. Replace updates the slot immediately.
- Rest controls offer 30/60/90 seconds, pause/resume/reset, a visual completion state, and an optional Web Audio beep. Completing a saved set starts its prescribed rest duration. Countdown calculations use elapsed time and catch up after backgrounding; browser suspension may delay sound. Sound is initialized through user interaction.
- The tempo modal guides one 3–6 second lowering phase per press, then cues a controlled return. It does not automatically record a rep or completed set.
- The dark live view has responsive cards, demonstration images, completion progress, a mobile rest control, keyboard-accessible native dialogs, and visible save errors.

The logging endpoint uses authenticated cookies, validates the owned plan and slot, checks equipment and movement compatibility, and keeps other users' plans inaccessible. Old whole-exercise logging now uses the updated composite conflict key. The dashboard counts distinct completed exercise/date combinations so individual set rows do not inflate its completed-exercise metric.


## Create programs in the app

Open **Workout & Programs** (`/workout`). The page has two creation choices, followed by saved programs and links to each session. The Exercise Library also links to the manual builder. No additional migration beyond the existing workout-engine/live-workout migrations is needed for these creation screens.

- **Generate my program** opens `/workout/new?mode=guided`. The questionnaire collects name, goal, experience, available equipment, match days, available training days, and preferred session length. It generates a draft first using `POST /api/generate-plan` with `preview: true`; no plan is saved at that stage. Experience controls difficulty eligibility and ranking, session length changes set volume, strength emphasizes lower reps/longer rest, football emphasizes power-session volume, and availability constrains the weekly schedule.
- **Build it myself** opens `/workout/new?mode=manual`. Choose equipment and four non-match weekdays, then add exercises from a searchable image library. Filter by movement pattern or equipment. Edit session focus, sets, reps, and rest; reorder or remove movements. Each session allows 1–10 distinct exercises.
- Both flows show editable session cards before saving. **Save program & start** calls `POST /api/programs`, then opens the saved program in the live logger. The server derives exercise names/patterns from the database, validates prescriptions, checks equipment and weekdays, and assigns the authenticated owner. The creation flow is four days to match the stored program schema. Empty libraries and impossible guided schedules display errors without saving an incomplete plan.
- The generator also accepts `goal` (`balanced`, `strength`, `football`), `experience` (`beginner`, `intermediate`, `advanced`), `session_minutes` (30, 45, 60), and `training_days` (at least four weekdays). All are optional for existing API clients. Existing non-preview calls still create a saved plan directly.
- `POST /api/programs` accepts `{ name, equipment, match_days, days }`. Each day includes `day`, `focus` (`upper`, `football_power`, or `custom`), and `exercises` containing `exercise_id`, `sets`, `reps`, and `rest_seconds`. It returns `{ plan: { id, name } }` with HTTP 201. Drafts are local to the creation screen until saved; regenerating replaces the current draft.


## Gym equipment catalog

Settings and both program creation flows share a searchable, grouped equipment selector. Categories include bodyweight/home gear, free weights, benches/racks, cable stations, upper/lower-body machines, core machines, cardio, football accessories, and recovery tools. The gym preset selects a broad starting inventory; users should uncheck unavailable equipment. Individual and category selection are supported, and settings submit all selected items even when groups are collapsed or filtered.

`lib/equipment.ts` centralizes the catalog, aliases, and matching. Dedicated machine requirements are inferred from exercise names when the dataset supplies a generic `machine` tag. Unknown machine requirements remain explicitly unspecified; a specific machine does not unlock all machine exercises. The generator, swaps, manual builder, live logging, and future seed runs use the shared matcher. Existing database equipment arrays do not need a migration or reseeding to benefit from runtime matching. Adding an equipment choice does not invent exercises for it; availability still depends on the exercise library.


## Session types, styles, and exercise previews

Each editable session now has separate **Session focus** and **Training style** selections. Focus options are Upper, Lower, Push, Pull, Plyometrics, Football power, and Custom/full body. Styles are Mixed, Gym, Bodyweight, Calisthenics, and Plyometrics. Core work is allowed across session types. Bodyweight allows support apparatus such as bars, rings, benches, and handles without external resistance; calisthenics uses the same resistance model with strength/control rather than plyometric work. Gym style selects externally loaded or machine exercises. Matching is based on the library's equipment and movement tags.

The guided questionnaire offers Hybrid, Upper/Lower, and Push/Pull/Lower/Lower splits, plus a preferred training style. The hybrid split keeps its football-power sessions mixed so bodyweight jumps can complement gym or calisthenics strength work. Manual session types/styles are editable independently. The exercise picker starts with those filters, and saving validates the final exercise selections. Changing a session type does not silently delete selected exercises: incompatible choices must be replaced or the type changed back before saving.

Added exercises display compact demonstration thumbnails in the program draft. Missing images use a small fallback icon. Saved program cards and the live workout show the chosen session labels. Live swap requests include the session index and preserve its style as well as movement pattern and equipment. Existing program JSON without a style continues to use Mixed. No database migration is required for these new JSON fields.


## Actual reps, load, and exercise history

The live workout now keeps prescribed targets separate from actual per-set results. Enter actual reps and weight in kg before checking Done. Each checked set saves its own reps and `weight_kg` to the existing log row; weight is no longer hardcoded by the API. For bodyweight exercises, use 0 for no added load. Users should keep a consistent convention for barbell total weight or dumbbell load when comparing sessions.

Completed sets remain editable. Changed values display an unsaved indicator and a **Save edits** button; only pressing that button updates the stored completed result. Saving an edit does not restart rest. Failed requests preserve the draft fields and display a retry error. Refresh restores each completed set's actual reps and weight independently. Unfinished entries and set-count adjustments remain in the current tab's session draft until sets are logged.

**Add set** supports up to ten sets per exercise. **Remove last** removes an unfinished final set; undo its completion first if it has already been logged. The number of completed log rows represents actual sets performed, independently of the target number of sets.

Each exercise has a **Previous performance** panel, backed by authenticated `GET /api/exercise-history`. It shows up to 60 previous completed log entries across the user's programs, grouped by date/session, including old aggregate logs and individual set logs. The currently open session slot is excluded. History displays actual sets, reps, and kg; **Use for unfinished sets** copies one result into the remaining draft inputs without modifying completed history. History reloads when an exercise is swapped. No additional database migration is needed beyond the existing live-workout migration.
