import { Dashboard } from '@/components/dashboard';
import { requireUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const start = new Date(); start.setUTCDate(start.getUTCDate() - (start.getUTCDay()+6)%7);
  const since = start.toISOString().slice(0,10);
  const [profile, logs, plan] = await Promise.all([
    supabase.from('ff_profiles').select('*').eq('id', user.id).single(),
    supabase.from('ff_workout_logs').select('exercise_id,date').eq('user_id',user.id).eq('completed',true).gte('date',since).lte('date',new Date().toISOString().slice(0,10)),
    supabase.from('ff_workout_plans').select('name,week_number').eq('user_id',user.id).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  ]);
  if (profile.error || logs.error || plan.error) throw new Error('Unable to load training data. Check your database migration and connection.');
  return <Dashboard email={user.email} completed={new Set(logs.data?.map(log=>`${log.date}:${log.exercise_id}`)).size} sessions={new Set(logs.data?.map(log=>log.date)).size} matchDays={profile.data?.match_days} goal={profile.data?.fitness_goal} planName={plan.data?.name} weekNumber={plan.data?.week_number}/>;
}
