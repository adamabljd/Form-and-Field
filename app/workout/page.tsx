export const dynamic = 'force-dynamic';
import { AppShell } from '@/components/app-shell';
import { WorkoutExercise } from '@/components/workout-exercise';
import { requireUser } from '@/lib/auth';
import { sampleExercises, type Exercise } from '@/lib/training';
export default async function WorkoutPage() {
  const { supabase, user } = await requireUser();
  const [exercises, substitutions, logs] = await Promise.all([
    supabase.from('ff_exercises').select('*').order('name'),
    supabase.from('ff_substitutions').select('exercise_id,alt_exercise_id'),
    supabase.from('ff_workout_logs').select('id,date,sets,reps,weight_kg,exercises:ff_exercises(name)').eq('user_id',user.id).order('date',{ascending:false}).limit(8),
  ]);
  if (exercises.error || substitutions.error || logs.error) throw new Error('Unable to load your workout.');
  const all = exercises.data as Exercise[];
  const recommended = sampleExercises.map(e=>all.find(item=>item.id===e.id)).filter((e): e is Exercise=>!!e);
  return <AppShell email={user.email}><p className="eyebrow text-accent">Show up for yourself</p><h1 className="mb-2 mt-2 text-3xl font-semibold tracking-tight">Full-body foundations.</h1><p className="mb-6 text-sm text-muted">A starter session · 4 movements · 35–45 minutes</p><div className="mb-6 max-w-4xl rounded-xl border border-[#e0e4d2] bg-[#eef0e5] p-4 text-xs leading-relaxed text-[#6c7759]">Start with 5 minutes of easy movement. Keep each rep controlled and rest between sets. Use the substitutions to match your equipment and ability.</div><div className="grid max-w-4xl gap-4">{recommended.map((exercise,index)=><WorkoutExercise key={exercise.id} exercise={exercise} index={index} alternatives={all.filter(e=>substitutions.data.some(s=>s.exercise_id===exercise.id && s.alt_exercise_id===e.id))}/>)}{!recommended.length && <p className="card p-6 text-sm">No exercises are available yet. Apply schema.sql to add the starter library.</p>}</div><section className="card mt-6 max-w-4xl p-6"><h2 className="mb-4 font-semibold">Recent training</h2>{logs.data.length ? <ul className="divide-y divide-line">{logs.data.map(log=><li key={log.id} className="flex flex-wrap justify-between gap-2 py-3 text-xs"><span className="font-medium">{(log.exercises as unknown as {name:string})?.name || 'Exercise'}</span><span className="text-muted">{log.sets} × {log.reps} · {log.weight_kg} kg · {log.date}</span></li>)}</ul> : <p className="text-sm text-muted">Your first completed movement starts the story.</p>}</section></AppShell>;
}
