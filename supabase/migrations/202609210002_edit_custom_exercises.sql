begin;
drop policy if exists "Update own exercises" on public.ff_exercises;
create policy "Update own exercises" on public.ff_exercises for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant update (name, primary_muscle, movement_pattern, equipment, difficulty, gif_url)
  on public.ff_exercises to authenticated;
commit;
