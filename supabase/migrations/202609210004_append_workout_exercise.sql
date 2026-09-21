begin;
create or replace function public.ff_append_workout_exercise(p_id uuid,p_day int,p_count int,p_exercise jsonb)
returns void language plpgsql security invoker set search_path=public as $$
declare current_program jsonb; entries jsonb;
begin
  select program into current_program from public.ff_workout_plans
    where id=p_id and user_id=auth.uid() for update;
  if current_program is null then raise exception 'Workout not found.'; end if;
  if p_day is null or p_day<0 or p_day>=jsonb_array_length(current_program->'days') then raise exception 'Day not found.'; end if;
  entries=current_program->'days'->p_day->'exercises';
  if p_count is null or jsonb_array_length(entries)<>p_count then raise exception 'Workout changed. Reload before adding an exercise.'; end if;
  if p_count>=10 then raise exception 'This day already has 10 exercises.'; end if;
  if p_exercise is null or not exists(select 1 from public.ff_exercises where id=(p_exercise->>'exercise_id')::uuid) then raise exception 'Exercise not found.'; end if;
  if exists(select 1 from jsonb_array_elements(entries) item where item->>'exercise_id'=p_exercise->>'exercise_id') then raise exception 'Exercise already added to this day.'; end if;
  update public.ff_workout_plans set program=jsonb_set(current_program,array['days',p_day::text,'exercises'],entries||jsonb_build_array(p_exercise)) where id=p_id and user_id=auth.uid();
end; $$;
revoke all on function public.ff_append_workout_exercise(uuid,int,int,jsonb) from public,anon;
grant execute on function public.ff_append_workout_exercise(uuid,int,int,jsonb) to authenticated;
commit;
