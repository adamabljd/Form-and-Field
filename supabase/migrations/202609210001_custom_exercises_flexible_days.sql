begin;
alter table public.ff_exercises add column if not exists user_id uuid references auth.users(id) on delete cascade;
drop policy if exists "Read exercise library" on public.ff_exercises;
create policy "Read exercise library" on public.ff_exercises for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));
drop policy if exists "Create own exercises" on public.ff_exercises;
create policy "Create own exercises" on public.ff_exercises for insert to authenticated
  with check (user_id = (select auth.uid()));
grant insert on public.ff_exercises to authenticated;
alter table public.ff_workout_logs drop constraint if exists ff_workout_logs_session_day_check;
alter table public.ff_workout_logs add constraint ff_workout_logs_session_day_check check (session_day between 0 and 6);
alter table public.ff_workout_plans drop constraint if exists ff_workout_plans_program_shape;
alter table public.ff_workout_plans
  add constraint ff_workout_plans_program_shape check (
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
  );
commit;
