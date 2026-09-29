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

export async function DELETE(request: Request) {
  try {
    const {supabase}=await authenticateApi();
    const body=objectBody(await readBody(request));
    if(typeof body.plan_id!=='string'||!uuidPattern.test(body.plan_id)||!Number.isInteger(body.day)||Number(body.day)<0||Number(body.day)>6||!Number.isInteger(body.slot_index)||Number(body.slot_index)<0||!Number.isInteger(body.expected_count)||Number(body.expected_count)<1||Number(body.expected_count)>10||Number(body.slot_index)>=Number(body.expected_count))throw new EngineError('Invalid exercise selection.',400);
    const {error}=await supabase.rpc('ff_remove_workout_exercise',{p_id:body.plan_id,p_day:body.day,p_slot:body.slot_index,p_count:body.expected_count});
    if(error)throw new EngineError(error.code==='P0001'?error.message:'Unable to remove exercise. Apply the remove-exercise migration.',409);
    revalidatePath('/workout');revalidatePath('/workout/[id]','page');
    return NextResponse.json({removed:true});
  }catch(error){return apiError(error);}
}

export async function PATCH(request: Request) {
  try {
    const {supabase}=await authenticateApi();
    const body=objectBody(await readBody(request));
    if(typeof body.plan_id!=='string'||!uuidPattern.test(body.plan_id)||!Number.isInteger(body.day)||Number(body.day)<0||Number(body.day)>6||!Array.isArray(body.order)||body.order.length<1||body.order.length>10||new Set(body.order).size!==body.order.length||body.order.some(i=>!Number.isInteger(i)||i<0||i>=(body.order as unknown[]).length)||!Array.isArray(body.expected_ids)||body.expected_ids.length!==body.order.length||body.expected_ids.some(id=>typeof id!=='string'||!uuidPattern.test(id))||!Array.isArray(body.groups)||body.groups.length!==body.order.length||body.groups.some(group=>group!==null&&(typeof group!=='string'||group.length>80)))throw new EngineError('Invalid workout layout.',400);
    const {error}=await supabase.rpc('ff_reorder_workout_exercises',{p_id:body.plan_id,p_day:body.day,p_order:body.order,p_expected:body.expected_ids,p_groups:body.groups});
    if(error)throw new EngineError(error.code==='P0001'?error.message:'Unable to save layout. Apply the supersets migration.',409);
    revalidatePath('/workout');revalidatePath('/workout/[id]','page');
    return NextResponse.json({saved:true});
  }catch(error){return apiError(error);}
}
