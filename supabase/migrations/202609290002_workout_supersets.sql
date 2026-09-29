begin;
create or replace function public.ff_reorder_workout_exercises(p_id uuid,p_day int,p_order int[],p_expected text[],p_groups text[])
returns void language plpgsql security invoker set search_path=public as $$
declare
  current_plan public.ff_workout_plans%rowtype;
  entries jsonb;
  reordered jsonb='[]'::jsonb;
  item jsonb;
  temporary_id uuid;
  i int;
  n int;
  current_ids text[];
begin
  select * into current_plan from public.ff_workout_plans where id=p_id and user_id=auth.uid() for update;
  if not found or current_plan.program is null then raise exception 'Workout not found.'; end if;
  if p_day is null or p_day<0 or p_day>=jsonb_array_length(current_plan.program->'days') then raise exception 'Day not found.'; end if;
  entries=current_plan.program->'days'->p_day->'exercises';
  n=jsonb_array_length(entries);
  select array_agg(value->>'exercise_id' order by ordinality) into current_ids from jsonb_array_elements(entries) with ordinality;
  if p_expected is distinct from current_ids then raise exception 'Workout changed. Reload before editing its order.'; end if;
  if n<1 or cardinality(p_order) is distinct from n or cardinality(p_groups) is distinct from n
    or (select count(distinct value) from unnest(p_order) value)<>n
    or exists(select 1 from unnest(p_order) value where value is null or value<0 or value>=n)
    or exists(select 1 from unnest(p_groups) value where length(value)>80)
    then raise exception 'Invalid workout layout.'; end if;
  for i in 1..n loop
    item=(entries->p_order[i])-'superset_id';
    if p_groups[i] is not null then item=item||jsonb_build_object('superset_id',p_groups[i]); end if;
    reordered=reordered||jsonb_build_array(item);
  end loop;
  -- Park the day's logs under an owned temporary plan to avoid index collisions.
  if exists(select 1 from public.ff_workout_logs where plan_id=p_id and session_day=p_day and user_id=auth.uid()) then
    insert into public.ff_workout_plans(user_id,name,week_number,program)
      values(auth.uid(),current_plan.name,current_plan.week_number,null) returning id into temporary_id;
    update public.ff_workout_logs set plan_id=temporary_id where plan_id=p_id and session_day=p_day and user_id=auth.uid();
    for i in 1..n loop
      update public.ff_workout_logs set plan_id=p_id,slot_index=i-1
        where plan_id=temporary_id and session_day=p_day and slot_index=p_order[i] and user_id=auth.uid();
    end loop;
    if exists(select 1 from public.ff_workout_logs where plan_id=temporary_id) then raise exception 'Unexpected log positions. Layout was not changed.'; end if;
    delete from public.ff_workout_plans where id=temporary_id and user_id=auth.uid();
  end if;
  update public.ff_workout_plans set program=jsonb_set(current_plan.program,array['days',p_day::text,'exercises'],reordered) where id=p_id and user_id=auth.uid();
end; $$;
revoke all on function public.ff_reorder_workout_exercises(uuid,int,int[],text[],text[]) from public,anon;
grant execute on function public.ff_reorder_workout_exercises(uuid,int,int[],text[],text[]) to authenticated;
commit;
