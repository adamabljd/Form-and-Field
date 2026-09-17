-- Apply after 202609170001_workout_engine.sql. Existing aggregate logs remain intact.
begin;
alter table public.ff_workout_logs
  add column plan_id uuid references public.ff_workout_plans(id) on delete cascade,
  add column session_day int check (session_day between 0 and 3),
  add column slot_index int check (slot_index between 0 and 49),
  add column set_index int check (set_index between 0 and 9),
  add column target_sets int check (target_sets between 1 and 10),
  add constraint ff_workout_logs_live_context check (
    (plan_id is null and session_day is null and slot_index is null and set_index is null and target_sets is null)
    or (plan_id is not null and session_day is not null and slot_index is not null and set_index is not null and target_sets is not null and set_index < target_sets and sets = 1)
  );
alter table public.ff_workout_logs drop constraint ff_workout_logs_user_id_exercise_id_date_key;
-- Keep legacy aggregate upserts idempotent, while supporting individual live sets.
alter table public.ff_workout_logs add constraint ff_workout_logs_entry_key
  unique nulls not distinct (user_id,exercise_id,date,plan_id,session_day,slot_index,set_index);
alter table public.ff_workout_logs add constraint ff_workout_logs_live_set_key
  unique (user_id,plan_id,session_day,slot_index,set_index,date);
-- Reinforce plan ownership at the database layer, including direct client access.
create policy "Live logs require owned plan" on public.ff_workout_logs as restrictive
  for all to authenticated
  using (plan_id is null or exists (select 1 from public.ff_workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())))
  with check (plan_id is null or exists (select 1 from public.ff_workout_plans p where p.id = plan_id and p.user_id = (select auth.uid())));
commit;
