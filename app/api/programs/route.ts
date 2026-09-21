import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { authenticateApi, readBody, loadExercises, apiError } from '@/lib/workout-api';
import { compatibleEquipment, EngineError, objectBody, parsePlanInput, type TrainingDay, type WeeklyProgram } from '@/lib/workout-engine';
import { sessionTypes, trainingStyles, matchesSession, matchesStyle, type TrainingStyle } from '@/lib/training-types';
import { days } from '@/lib/training';

export async function POST(request: Request) {
  try {
    const { supabase,user } = await authenticateApi();
    const body = objectBody(await readBody(request));
    if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length>100) throw new EngineError('Give your program a name (up to 100 characters).',400);
    const input = parsePlanInput({equipment:body.equipment,match_days:body.match_days});
    if (!Array.isArray(body.days) || body.days.length<1 || body.days.length>7) throw new EngineError('Create between one and seven training days.',400);
    const library = await loadExercises(supabase);
    const usedDays = new Set<string>();
    const sessions: TrainingDay[] = body.days.map((raw,index)=>{
      const session = objectBody(raw);
      if (typeof session.day !== 'string' || !days.includes(session.day) || usedDays.has(session.day)) throw new EngineError('Choose a different weekday for every session.',400);
      if (input.match_days.includes(session.day)) throw new EngineError(`${session.day} is a match day. Choose another training day.`,400);
      usedDays.add(session.day);
      if (!sessionTypes.some(type=>type.value===session.focus)) throw new EngineError('Choose a session focus.',400);
      const style = session.style ?? 'mixed';
      if (!trainingStyles.some(item=>item.value===style)) throw new EngineError('Choose a training style.',400);
      if (!Array.isArray(session.exercises) || session.exercises.length<1 || session.exercises.length>10) throw new EngineError(`Session ${index+1} needs 1–10 exercises.`,400);
      const exerciseIds = new Set<string>();
      const exercises = session.exercises.map(rawExercise=>{
        const item = objectBody(rawExercise);
        const exercise = library.find(e=>e.id===item.exercise_id);
        if (!exercise) throw new EngineError('An exercise was removed from the library. Choose another one.',422);
        if (!matchesSession(exercise,session.focus as string) || !matchesStyle(exercise,style as string)) throw new EngineError(`${exercise.name} does not match this session type/style. Change the session selection or replace the exercise.`,422);
        if (exerciseIds.has(exercise.id)) throw new EngineError('Use an exercise only once per session; increase its sets instead.',400);
        exerciseIds.add(exercise.id);
        if (!compatibleEquipment(exercise,input.equipment)) throw new EngineError(`Add the required equipment for ${exercise.name} or choose another exercise.`,422);
        for (const [key,max] of [['sets',10],['reps',100],['rest_seconds',300]] as const) {
          if (!Number.isInteger(item[key]) || (item[key] as number)<1 || (item[key] as number)>max) throw new EngineError(`Invalid ${key.replace('_',' ')} for ${exercise.name}.`,400);
        }
        return {exercise_id:exercise.id,name:exercise.name,movement_pattern:exercise.movement_pattern,
          sets:item.sets as number,reps:item.reps as number,rest_seconds:item.rest_seconds as number,
          per_side:/single[ -]?leg|one[ -]?leg|split squat|lunge|lateral bound/i.test(exercise.name)};
      });
      return {day:session.day,focus:session.focus as TrainingDay['focus'],style:style as TrainingStyle,exercises};
    });
    const warnings = sessions.filter(session=>['football_power','lower','plyometrics'].includes(session.focus) && input.match_days.includes(days[(days.indexOf(session.day)+1)%7]))
      .map(session=>`${session.day}: football power is scheduled before a match. Consider another day for recovery.`);
    const program: WeeklyProgram = {version:1,equipment:input.equipment,match_days:input.match_days,days:sessions,warnings};
    const {error:profileError}=await supabase.from('ff_profiles').upsert({id:user.id},{onConflict:'id',ignoreDuplicates:true});
    if(profileError)throw new EngineError('Unable to initialize your training profile.',503);
    const {data,error}=await supabase.from('ff_workout_plans').insert({user_id:user.id,name:body.name.trim(),week_number:1,program}).select('id,name').single();
    if(error)throw new EngineError('Unable to save your program. Check that the workout-engine migration is applied.',503);
    revalidatePath('/workout');revalidatePath('/dashboard');
    return NextResponse.json({plan:data},{status:201,headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return apiError(error);}
}
