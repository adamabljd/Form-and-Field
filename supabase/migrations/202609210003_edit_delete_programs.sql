-- Preserve logged history when a saved program is edited or deleted.
begin;
create or replace function public.ff_edit_program(
  p_id uuid, p_name text, p_program jsonb, p_delete boolean default false
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  existing public.ff_workout_plans%rowtype;
  history_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  select * into existing from public.ff_workout_plans
    where id = p_id and user_id = auth.uid() and program is not null for update;
  if not found then return false; end if;
  if not p_delete and (p_name is null or length(trim(p_name)) = 0 or length(p_name) > 100 or p_program is null) then
    raise exception 'Invalid program';
  end if;
  -- A history-only record keeps existing set identities and foreign keys intact.
  -- It is omitted from the saved-program list because its program is null.
  if exists(select 1 from public.ff_workout_logs where plan_id = p_id and user_id = auth.uid()) then
    insert into public.ff_workout_plans(user_id, name, week_number, program)
      values(auth.uid(), existing.name, existing.week_number, null) returning id into history_id;
    update public.ff_workout_logs set plan_id = history_id
      where plan_id = p_id and user_id = auth.uid();
  end if;
  if p_delete then
    delete from public.ff_workout_plans where id = p_id and user_id = auth.uid();
  else
    update public.ff_workout_plans set name = trim(p_name), program = p_program
      where id = p_id and user_id = auth.uid();
  end if;
  return true;
end;
$$;
revoke all on function public.ff_edit_program(uuid,text,jsonb,boolean) from public, anon;
grant execute on function public.ff_edit_program(uuid,text,jsonb,boolean) to authenticated;
commit;
