import { NextResponse } from 'next/server';
import { authenticateApi, apiError } from '@/lib/workout-api';
import { EngineError } from '@/lib/workout-engine';
import { uuidPattern, validDate } from '@/lib/live-workout';
export async function GET(request:Request) {
  try {
    const {supabase,user}=await authenticateApi();
    const params=new URL(request.url).searchParams;
    const id=params.get('exercise_id');const date=params.get('date');const plan=params.get('plan_id');
    const day=Number(params.get('day'));const slot=Number(params.get('slot'));
    if(!id||!uuidPattern.test(id)||!plan||!uuidPattern.test(plan)||!validDate(date)||!Number.isInteger(day)||day<0||day>6||!Number.isInteger(slot)||slot<0||slot>49)throw new EngineError('Invalid history request.',400);
    const {data,error}=await supabase.from('ff_workout_logs')
      .select('id,date,plan_id,session_day,slot_index,set_index,sets,reps,weight_kg')
      .eq('user_id',user.id).eq('exercise_id',id).eq('completed',true).lte('date',date)
      .or(`plan_id.is.null,plan_id.neq.${plan},session_day.neq.${day},slot_index.neq.${slot},date.neq.${date}`)
      .order('date',{ascending:false}).order('plan_id').order('session_day').order('slot_index').order('set_index').limit(60);
    if(error)throw new EngineError('Unable to load exercise history.',503);
    return NextResponse.json({logs:data},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return apiError(error);}
}
