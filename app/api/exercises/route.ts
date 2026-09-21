import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { authenticateApi, readBody, loadExercises, apiError } from '@/lib/workout-api';
import { EngineError, objectBody } from '@/lib/workout-engine';
import { uuidPattern } from '@/lib/live-workout';
import { patterns } from '@/lib/training';

async function saveExercise(request: Request, editing: boolean) {
  try {
    const { supabase, user } = await authenticateApi();
    const body = objectBody(await readBody(request));
    if (editing && (typeof body.id !== 'string' || !uuidPattern.test(body.id))) throw new EngineError('Invalid exercise ID.', 400);
    const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
    if (!text(body.name, 120) || !text(body.primary_muscle, 80)) throw new EngineError('Enter an exercise name and primary muscle.', 400);
    if (!patterns.some(pattern => pattern === body.movement_pattern)) throw new EngineError('Choose a movement pattern.', 400);
    if (!Number.isInteger(body.difficulty) || Number(body.difficulty) < 1 || Number(body.difficulty) > 5) throw new EngineError('Difficulty must be between 1 and 5.', 400);
    if (!Array.isArray(body.equipment) || body.equipment.length > 160 || body.equipment.some(item => !text(item, 100))) throw new EngineError('Choose valid equipment.', 400);
    let gif_url: string | null = null;
    if (body.gif_url) {
      try { const url = new URL(String(body.gif_url)); if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2000) throw new Error(); gif_url = url.href; }
      catch { throw new EngineError('Use an HTTPS image URL.', 400); }
    }
    const values = {
      name: String(body.name).trim(), primary_muscle: String(body.primary_muscle).trim(),
      movement_pattern: body.movement_pattern, equipment: [...new Set(body.equipment)], difficulty: body.difficulty, gif_url,
    };
    const query = editing
      ? supabase.from('ff_exercises').update(values).eq('id', body.id).eq('user_id', user.id)
      : supabase.from('ff_exercises').insert({ ...values, user_id: user.id });
    const { data, error } = await query.select('id,user_id,name,primary_muscle,movement_pattern,equipment,difficulty,gif_url').maybeSingle();
    if (error) throw new EngineError(editing ? 'Unable to update exercise. Check that the exercise-editing migration is applied.' : 'Unable to save exercise. Apply the custom-exercises migration first.', 503);
    if (!data) throw new EngineError('Exercise not found or you do not have permission to edit it.', 404);
    revalidatePath('/workout'); revalidatePath('/workout/[id]', 'page');
    revalidatePath('/exercises'); revalidatePath('/workout/new');
    return NextResponse.json({ exercise: data }, { status: editing ? 200 : 201 });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) { return saveExercise(request, false); }
export async function PATCH(request: Request) { return saveExercise(request, true); }

export async function GET() {
  try { const {supabase}=await authenticateApi(); return NextResponse.json({exercises:await loadExercises(supabase)},{headers:{'Cache-Control':'private, no-store'}}); }
  catch(error){return apiError(error);}
}
