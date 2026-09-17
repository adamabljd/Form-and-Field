import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { authenticateApi, readBody, loadExercises, apiError } from '@/lib/workout-api';
import { EngineError, generateProgram, parsePlanInput, objectBody } from '@/lib/workout-engine';

export async function POST(request: Request) {
  try {
    const { supabase, user } = await authenticateApi();
    const body = objectBody(await readBody(request));
    if (body.preview !== undefined && typeof body.preview !== 'boolean') throw new EngineError('preview must be a boolean.',400);
    const input = parsePlanInput(body);
    const program = generateProgram(await loadExercises(supabase), input);
    if (body.preview) return NextResponse.json({ program }, {headers:{'Cache-Control':'private, no-store'}});
    const profile = await supabase.from('ff_profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });
    if (profile.error) throw new EngineError('Unable to initialize your training profile.', 503);
    const { data, error } = await supabase.from('ff_workout_plans').insert({
      user_id: user.id,
      name: 'Hybrid calisthenics & football power',
      week_number: input.week_number,
      program,
    }).select('id,name,week_number,created_at,program').single();
    if (error) throw new EngineError('Unable to save plan. Ensure the workout-engine migration is applied.', 503);
    revalidatePath('/dashboard'); revalidatePath('/workout');
    return NextResponse.json({ plan: data }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}
