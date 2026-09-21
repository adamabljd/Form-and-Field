import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { authenticateApi, readBody, apiError } from '@/lib/workout-api';
import { EngineError, objectBody, prescription } from '@/lib/workout-engine';
import { uuidPattern } from '@/lib/live-workout';
export async function POST(request: Request) {
  try {
    const {supabase}=await authenticateApi();
    const body=objectBody(await readBody(request));
    if(typeof body.plan_id!=='string'||!uuidPattern.test(body.plan_id)||typeof body.exercise_id!=='string'||!uuidPattern.test(body.exercise_id)||!Number.isInteger(body.day)||Number(body.day)<0||Number(body.day)>6||!Number.isInteger(body.expected_count)||Number(body.expected_count)<0||Number(body.expected_count)>=10)throw new EngineError('Invalid exercise selection.',400);
    const {data:exercise,error:readError}=await supabase.from('ff_exercises').select('*').eq('id',body.exercise_id).maybeSingle();
    if(readError)throw new EngineError('Unable to load exercise.',503);
    if(!exercise)throw new EngineError('Exercise not found.',404);
    const target=prescription(exercise);
    const {error}=await supabase.rpc('ff_append_workout_exercise',{p_id:body.plan_id,p_day:body.day,p_count:body.expected_count,p_exercise:target});
    if(error)throw new EngineError(error.code==='P0001'?error.message:'Unable to add exercise. Apply the add-exercise migration.',409);
    revalidatePath('/workout');revalidatePath('/workout/[id]','page');
    return NextResponse.json({exercise,target});
  }catch(error){return apiError(error);}
}
