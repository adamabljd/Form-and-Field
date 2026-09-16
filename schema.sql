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
  unique (user_id, exercise_id, date)
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

insert into public.ff_exercises (id,name,movement_pattern,primary_muscle,equipment,difficulty) values
('11111111-1111-4111-8111-111111111111','Pull-ups','vertical_pull','Back & biceps',array['Pull-up bar'],3),
('22222222-2222-4222-8222-222222222222','Push-ups','horizontal_push','Chest & triceps','{}',2),
('33333333-3333-4333-8333-333333333333','Bulgarian split squats','knee_dominant','Quads & glutes',array['Bench'],3),
('44444444-4444-4444-8444-444444444444','Dead bugs','core','Core','{}',1),
('55555555-5555-4555-8555-555555555555','Band-assisted pull-ups','vertical_pull','Back & biceps',array['Pull-up bar','Resistance bands'],2),
('66666666-6666-4666-8666-666666666666','Incline push-ups','horizontal_push','Chest & triceps',array['Bench'],1),
('77777777-7777-4777-8777-777777777777','Bodyweight squats','knee_dominant','Quads & glutes','{}',1),
('88888888-8888-4888-8888-888888888888','Pike push-ups','vertical_push','Shoulders & triceps','{}',3),
('99999999-9999-4999-8999-999999999999','Ring rows','horizontal_pull','Back & biceps',array['Gym rings'],2),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Glute bridges','hip_hinge','Glutes & hamstrings','{}',1),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Squat jumps','plyo','Quads & calves','{}',3),
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Bird dogs','core','Core & back','{}',1);
insert into public.ff_substitutions(exercise_id,alt_exercise_id,reason) values
('11111111-1111-4111-8111-111111111111','55555555-5555-4555-8555-555555555555','Add band assistance while building pulling strength.'),
('22222222-2222-4222-8222-222222222222','66666666-6666-4666-8666-666666666666','Reduce the load with an elevated hand position.'),
('33333333-3333-4333-8333-333333333333','77777777-7777-4777-8777-777777777777','No bench required; develop the squat pattern.'),
('44444444-4444-4444-8444-444444444444','cccccccc-cccc-4ccc-8ccc-cccccccccccc','Alternative bodyweight core-control movement.');
commit;
