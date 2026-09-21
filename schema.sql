-- Form & Field: run once in the Supabase SQL editor in your existing or new project before using Form & Field.
-- Creates only ff_-prefixed app objects. Does not rename or modify existing app tables.
-- Run once. If ff_ objects already exist, the transaction fails without overwriting them.
-- All personal data is protected by row-level security.
begin;
create extension if not exists pgcrypto;

create table public.ff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  equipment_list text[] not null default '{}',
  match_days text[] not null default '{}' check (match_days <@ array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']::text[]),
  fitness_goal text not null default 'Hybrid fitness'
);
create table public.ff_exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  movement_pattern text not null check (movement_pattern in ('vertical_push','horizontal_push','vertical_pull','horizontal_pull','knee_dominant','hip_hinge','plyo','core')),
  primary_muscle text not null,
  equipment text[] not null default '{}',
  gif_url text,
  difficulty int not null default 1 check (difficulty between 1 and 5)
);
create table public.ff_substitutions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.ff_exercises(id) on delete cascade,
  alt_exercise_id uuid not null references public.ff_exercises(id) on delete cascade,
  reason text not null,
  unique (exercise_id, alt_exercise_id),
  check (exercise_id <> alt_exercise_id)
);
create table public.ff_workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ff_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text not null,
  program jsonb constraint ff_workout_plans_program_shape check (
    program is null or coalesce((
      jsonb_typeof(program) = 'object'
      and program ?& array['version','equipment','match_days','days','warnings']
      and program->>'version' = '1'
      and jsonb_typeof(program->'equipment') = 'array'
      and jsonb_typeof(program->'match_days') = 'array'
      and jsonb_typeof(program->'warnings') = 'array'
      and case when jsonb_typeof(program->'days') = 'array'
        then jsonb_array_length(program->'days') between 1 and 7 else false end
    ), false)
  ),
  week_number int not null default 1 check (week_number > 0)
);
create table public.ff_workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ff_profiles(id) on delete cascade,
  exercise_id uuid not null references public.ff_exercises(id),
  sets int not null check (sets between 1 and 50),
  reps int not null check (reps between 1 and 1000),
  weight_kg numeric(7,2) not null default 0 check (weight_kg between 0 and 1000),
  completed boolean not null default false,
  date date not null default current_date,
  plan_id uuid references public.ff_workout_plans(id) on delete cascade,
  session_day int check (session_day between 0 and 6),
  slot_index int check (slot_index between 0 and 49),
  set_index int check (set_index between 0 and 9),
  target_sets int check (target_sets between 1 and 10),
  constraint ff_workout_logs_live_context check (
    (plan_id is null and session_day is null and slot_index is null and set_index is null and target_sets is null)
    or (plan_id is not null and session_day is not null and slot_index is not null and set_index is not null and target_sets is not null and set_index < target_sets and sets = 1)
  ),
  constraint ff_workout_logs_entry_key unique nulls not distinct (user_id,exercise_id,date,plan_id,session_day,slot_index,set_index),
  constraint ff_workout_logs_live_set_key unique (user_id,plan_id,session_day,slot_index,set_index,date)
);
create index ff_workout_plans_user_created_idx on public.ff_workout_plans(user_id, created_at desc);
create index ff_workout_logs_user_date_idx on public.ff_workout_logs(user_id, date desc);
create index ff_workout_logs_exercise_idx on public.ff_workout_logs(exercise_id);
create index ff_substitutions_alt_idx on public.ff_substitutions(alt_exercise_id);

alter table public.ff_profiles enable row level security;
alter table public.ff_exercises enable row level security;
alter table public.ff_substitutions enable row level security;
alter table public.ff_workout_plans enable row level security;
alter table public.ff_workout_logs enable row level security;

create policy "Read own profile" on public.ff_profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Insert own profile" on public.ff_profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Update own profile" on public.ff_profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "Read exercise library" on public.ff_exercises for select to authenticated using (true);
create policy "Read substitutions" on public.ff_substitutions for select to authenticated using (true);
create policy "Manage own plans" on public.ff_workout_plans for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Manage own logs" on public.ff_workout_logs for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Live logs require owned plan" on public.ff_workout_logs as restrictive
  for all to authenticated
  using (plan_id is null or exists (select 1 from public.ff_workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())))
  with check (plan_id is null or exists (select 1 from public.ff_workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())));

revoke all on public.ff_profiles, public.ff_exercises, public.ff_substitutions, public.ff_workout_plans, public.ff_workout_logs from anon;
revoke all on public.ff_profiles, public.ff_exercises, public.ff_substitutions, public.ff_workout_plans, public.ff_workout_logs from authenticated;
grant select, insert, update on public.ff_profiles to authenticated;
grant select on public.ff_exercises, public.ff_substitutions to authenticated;
grant select, insert, update, delete on public.ff_workout_plans, public.ff_workout_logs to authenticated;

-- Initialize a starter plan only when someone first uses Form & Field.
-- This trigger is scoped to ff_profiles; existing auth.users triggers are untouched.
create function public.ff_handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.ff_workout_plans (user_id, name, week_number)
  values (new.id, 'Full-body foundations', 1);
  return new;
end;
$$;
revoke all on function public.ff_handle_new_user() from public;
create trigger ff_on_profile_created after insert on public.ff_profiles
for each row execute function public.ff_handle_new_user();

-- Populate the exercise library with npm run db:seed.
commit;

-- Private custom exercises
alter table public.ff_exercises add column user_id uuid references auth.users(id) on delete cascade;
drop policy "Read exercise library" on public.ff_exercises;
create policy "Read exercise library" on public.ff_exercises for select to authenticated using (user_id is null or user_id = (select auth.uid()));
create policy "Create own exercises" on public.ff_exercises for insert to authenticated with check (user_id = (select auth.uid()));
grant insert on public.ff_exercises to authenticated;

create policy "Update own exercises" on public.ff_exercises for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant update (name, primary_muscle, movement_pattern, equipment, difficulty, gif_url)
  on public.ff_exercises to authenticated;
