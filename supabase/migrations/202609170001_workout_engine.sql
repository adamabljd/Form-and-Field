-- Apply once to existing Form & Field databases. Existing plans remain valid.
begin;
alter table public.ff_workout_plans
  add column if not exists program jsonb;
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
        then jsonb_array_length(program->'days') = 4 else false end
    ), false)
  );
commit;
