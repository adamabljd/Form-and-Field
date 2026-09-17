import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { isProgram, uuidPattern, validDate, type LiveSlot, type SavedSet } from '@/lib/live-workout';
import type { Exercise } from '@/lib/training';
import { LiveWorkout } from '@/components/workout/live-workout';
export const dynamic = 'force-dynamic';

export default async function LiveWorkoutPage({ params, searchParams }: {
  params: Promise<{id:string}>; searchParams: Promise<{day?:string;date?:string}>;
}) {
  const { user, supabase } = await requireUser();
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const { data:plan,error } = await supabase.from('ff_workout_plans').select('id,name,program').eq('id',id).eq('user_id',user.id).maybeSingle();
  if (error) throw new Error('Unable to load workout.');
  if (!plan) notFound();
  if (!isProgram(plan.program)) return <main className="min-h-screen bg-zinc-950 p-8 text-zinc-100"><h1 className="text-2xl font-semibold">Generate a four-day plan first.</h1><p className="my-4 text-zinc-400">This older plan does not have an exercise schedule.</p><Link href="/workout" className="text-lime-400">Back to workouts →</Link></main>;
  const query = await searchParams;
  const dayIndex = query.day === undefined ? 0 : Number(query.day);
  if (!Number.isInteger(dayIndex) || dayIndex < 0 || dayIndex > 3 || (query.date && !validDate(query.date))) notFound();
  // Client adds its local date when absent, so a late-night workout never changes date midway.
  const date = query.date || new Date().toISOString().slice(0,10);
  const day = plan.program.days[dayIndex];
  const { data:logs,error:logError } = await supabase.from('ff_workout_logs').select('exercise_id,slot_index,set_index,target_sets,reps,weight_kg,completed')
    .eq('user_id',user.id).eq('plan_id',id).eq('session_day',dayIndex).eq('date',date).eq('completed',true);
  if (logError) throw new Error('Unable to load completed sets. Apply the live-workout migration.');
  const ids = [...new Set([...day.exercises.map(e=>e.exercise_id),...logs.map(row=>row.exercise_id)])];
  const { data:exercises,error:exerciseError } = await supabase.from('ff_exercises').select('*').in('id',ids);
  if (exerciseError) throw new Error('Unable to load exercise demonstrations.');
  const slots: LiveSlot[] = day.exercises.map((target,index) => {
    const saved = (logs as SavedSet[]).filter(log=>log.slot_index===index);
    const exercise = (exercises as Exercise[]).find(e=>e.id===(saved[0]?.exercise_id || target.exercise_id));
    if (!exercise) throw new Error('An exercise in this plan is no longer available. Generate a new plan.');
    const count=Math.max(saved[0]?.target_sets || target.sets,...saved.map(s=>s.set_index+1));
    const defaultWeight=exercise.equipment.some(item=>/20\s?kg/i.test(item))?20:0;
    return {exercise,target:{...target,exercise_id:exercise.id,name:exercise.name,sets:count,per_side:/single[ -]?leg|one[ -]?leg|split squat|lunge|lateral bound/i.test(exercise.name)},completed:saved.map(log=>log.set_index),results:Array.from({length:count},(_,setIndex)=>{
      const row=saved.find(log=>log.set_index===setIndex);
      return row?{reps:row.reps,weight_kg:Number(row.weight_kg),saved:{reps:row.reps,weight_kg:Number(row.weight_kg)}}:{reps:target.reps,weight_kg:defaultWeight};
    })};
  });
  return <LiveWorkout key={`${id}:${dayIndex}:${date}`} planId={id} name={plan.name} dayIndex={dayIndex} day={day.day} focus={day.focus} date={date} hasDate={Boolean(query.date)} initialSlots={slots} schedule={plan.program.days.map(d=>d.day)}/>;
}
