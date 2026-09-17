import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { authenticateApi, readBody, apiError } from '@/lib/workout-api';
import { EngineError, compatibleEquipment, objectBody } from '@/lib/workout-engine';
import { isProgram, uuidPattern, validDate } from '@/lib/live-workout';
import { matchesStyle, matchesSession } from '@/lib/training-types';
import type { Exercise } from '@/lib/training';

export async function POST(request: Request) {
  try {
    const { supabase, user } = await authenticateApi();
    const body = objectBody(await readBody(request));
    if (typeof body.plan_id !== 'string' || !uuidPattern.test(body.plan_id)
      || typeof body.exercise_id !== 'string' || !uuidPattern.test(body.exercise_id)
      || !validDate(body.date) || typeof body.completed !== 'boolean'
      || !Number.isInteger(body.session_day) || !Number.isInteger(body.slot_index)
      || !Number.isInteger(body.set_index) || (body.set_index as number) < 0 || (body.set_index as number) >= 10
      || !Number.isInteger(body.target_sets) || (body.target_sets as number) < 1 || (body.target_sets as number) > 10 || (body.set_index as number) >= (body.target_sets as number)
      || typeof body.weight_kg !== 'number' || !Number.isFinite(body.weight_kg) || body.weight_kg < 0 || body.weight_kg > 1000 || Math.abs(body.weight_kg*100-Math.round(body.weight_kg*100))>0.000001
      || !Number.isInteger(body.reps) || (body.reps as number) < 1 || (body.reps as number) > 100) {
      throw new EngineError('Invalid set details.', 400);
    }
    const { data: plan, error: planError } = await supabase.from('ff_workout_plans').select('program').eq('id',body.plan_id).eq('user_id',user.id).maybeSingle();
    if (planError) throw new EngineError('Unable to load workout.',503);
    if (!plan) throw new EngineError('Workout not found.',404);
    if (!isProgram(plan.program)) throw new EngineError('This plan has no live workout program.',422);
    const session = plan.program.days[body.session_day as number];
    const slot = session?.exercises[body.slot_index as number];
    if (!slot) throw new EngineError('Workout slot not found.',404);
    const { data: exercise, error: exerciseError } = await supabase.from('ff_exercises').select('*').eq('id',body.exercise_id).maybeSingle();
    if (exerciseError) throw new EngineError('Unable to load exercise.',503);
    if (!exercise || exercise.movement_pattern !== slot.movement_pattern || !compatibleEquipment(exercise as Exercise,plan.program.equipment)) throw new EngineError('Exercise is not compatible with this workout slot.',422);
    if (!matchesStyle(exercise as Exercise,session.style||'mixed') || !matchesSession(exercise as Exercise,session.focus)) throw new EngineError('Exercise does not match this session type and training style.',422);
    const { data: otherSets, error: logError } = await supabase.from('ff_workout_logs').select('exercise_id').eq('user_id',user.id)
      .eq('plan_id',body.plan_id).eq('session_day',body.session_day).eq('slot_index',body.slot_index).eq('date',body.date).eq('completed',true).neq('set_index',body.set_index);
    if (logError) throw new EngineError('Unable to load sets. Apply the live-workout migration.',503);
    if (otherSets.some(row => row.exercise_id !== body.exercise_id)) throw new EngineError('This slot has completed sets for another exercise. Reload your workout before continuing.',409);
    const { error } = await supabase.from('ff_workout_logs').upsert({
      user_id:user.id, plan_id:body.plan_id, session_day:body.session_day, slot_index:body.slot_index,
      set_index:body.set_index, target_sets:body.target_sets, exercise_id:body.exercise_id, sets:1, reps:body.reps,
      weight_kg:body.weight_kg, completed:body.completed, date:body.date,
    }, { onConflict:'user_id,plan_id,session_day,slot_index,set_index,date' });
    if (error) throw new EngineError('Could not save this set. Apply the live-workout migration and try again.',503);
    revalidatePath('/dashboard');
    return NextResponse.json({ saved:true },{headers:{'Cache-Control':'private, no-store'}});
  } catch (error) { return apiError(error); }
}
