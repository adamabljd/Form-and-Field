begin;
create or replace function public.ff_remove_workout_exercise(p_id uuid,p_day int,p_slot int,p_count int)
returns void language plpgsql security invoker set search_path=public as $$
declare
  current_plan public.ff_workout_plans%rowtype;
  entries jsonb;
  history_id uuid;
  position int;
begin
  select * into current_plan from public.ff_workout_plans where id=p_id and user_id=auth.uid() for update;
  if not found or current_plan.program is null then raise exception 'Workout not found.'; end if;
  if p_day is null or p_day<0 or p_day>=jsonb_array_length(current_plan.program->'days') then raise exception 'Day not found.'; end if;
  entries=current_plan.program->'days'->p_day->'exercises';
  if p_count is null or jsonb_array_length(entries)<>p_count then raise exception 'Workout changed. Reload before removing an exercise.'; end if;
  if p_slot is null or p_slot<0 or p_slot>=p_count then raise exception 'Exercise not found.'; end if;
  if exists(select 1 from public.ff_workout_logs where plan_id=p_id and session_day=p_day and slot_index=p_slot and user_id=auth.uid()) then
    insert into public.ff_workout_plans(user_id,name,week_number,program) values(auth.uid(),current_plan.name,current_plan.week_number,null) returning id into history_id;
    update public.ff_workout_logs set plan_id=history_id where plan_id=p_id and session_day=p_day and slot_index=p_slot and user_id=auth.uid();
  end if;
  -- Move subsequent slots one at a time into the vacant position to avoid unique-key conflicts.
  for position in p_slot+1..p_count-1 loop
    update public.ff_workout_logs set slot_index=position-1 where plan_id=p_id and session_day=p_day and slot_index=position and user_id=auth.uid();
  end loop;
  update public.ff_workout_plans set program=jsonb_set(current_plan.program,array['days',p_day::text,'exercises'],entries-p_slot) where id=p_id and user_id=auth.uid();
end; $$;
revoke all on function public.ff_remove_workout_exercise(uuid,int,int,int) from public,anon;
grant execute on function public.ff_remove_workout_exercise(uuid,int,int,int) to authenticated;
commit;
