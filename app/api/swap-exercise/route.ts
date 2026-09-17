import { NextResponse } from 'next/server';
import { authenticateApi, readBody, loadExercises, apiError } from '@/lib/workout-api';
import { EngineError, parseSwapInput, swapCandidates } from '@/lib/workout-engine';
import { matchesStyle, matchesSession } from '@/lib/training-types';
import type { Exercise } from '@/lib/training';

export async function POST(request: Request) {
  try {
    const { supabase, user } = await authenticateApi();
    const input = parseSwapInput(await readBody(request));
    let planQuery = supabase.from('ff_workout_plans').select('program').eq('user_id', user.id);
    if (input.plan_id) planQuery = planQuery.eq('id', input.plan_id);
    else planQuery = planQuery.not('program', 'is', null).order('created_at', { ascending: false }).order('id').limit(1);
    const [current, profile, plan] = await Promise.all([
      supabase.from('ff_exercises').select('*').eq('id', input.current_exercise_id).maybeSingle(),
      supabase.from('ff_profiles').select('equipment_list').eq('id', user.id).maybeSingle(),
      planQuery.maybeSingle(),
    ]);
    if (current.error || profile.error || plan.error) throw new EngineError('Unable to load swap context. Ensure the workout-engine migration is applied.', 503);
    if (input.plan_id && !plan.data) throw new EngineError('Workout not found.', 404);
    if (!current.data) throw new EngineError('Exercise not found.', 404);
    // Use the equipment snapshot supplied for the user's latest generated plan.
    // Accounts without a generated plan use their saved profile preferences.
    const equipment: string[] = plan.data?.program?.equipment ?? profile.data?.equipment_list ?? [];
    const exercise = current.data as Exercise;
    const session = input.session_day === undefined ? undefined : plan.data?.program?.days?.[input.session_day];
    const pool = (await loadExercises(supabase, exercise.movement_pattern)).filter(candidate => !session || (matchesStyle(candidate,session.style||'mixed') && matchesSession(candidate,session.focus)));
    const candidates = swapCandidates(exercise, pool, equipment, input.current_reps, input.reason);
    return NextResponse.json({
      current_exercise_id: exercise.id, candidates,
      message: candidates.length ? undefined : 'No compatible replacements match this reason and equipment. No cross-pattern substitution was forced.',
      warning: input.reason === 'joint_soreness' ? 'Difficulty is not a measure of joint safety. These are lower-difficulty options, not injury-specific recommendations; stop any movement that hurts.' : undefined,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
