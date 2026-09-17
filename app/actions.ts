'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { normalizeEquipment } from '@/lib/equipment';
import { days, equipmentOptions } from '@/lib/training';
export type ActionState = { error?: string; success?: string };
export async function saveProfile(_state: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const equipment = form.getAll('equipment').map(String);
  const matchDays = form.getAll('match_days').map(String);
  const goal = String(form.get('fitness_goal') || '');
  if ((equipment.length>160 || equipment.some(x=>x.length>80 || !equipmentOptions.some(option=>normalizeEquipment(option)===normalizeEquipment(x)))) || matchDays.some(x=>!days.includes(x)) || !['Hybrid fitness','Build strength','Football performance','Improve endurance'].includes(goal)) return { error: 'Please choose valid training preferences.' };
  const { error } = await supabase.from('ff_profiles').upsert({ id: user.id, equipment_list: equipment, match_days: matchDays, fitness_goal: goal });
  if (error) return { error: 'Unable to save your preferences. Please try again.' };
  revalidatePath('/settings'); revalidatePath('/dashboard'); revalidatePath('/workout');
  return { success: 'Your training preferences are saved.' };
}
export async function logExercise(_state: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const exerciseId = String(form.get('exercise_id') || '');
  const sets = Number(form.get('sets')); const reps = Number(form.get('reps')); const weight = Number(form.get('weight_kg'));
  const date = String(form.get('date') || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exerciseId) || !Number.isInteger(sets) || sets<1 || sets>50 || !Number.isInteger(reps) || reps<1 || reps>1000 || !Number.isFinite(weight) || weight<0 || weight>1000 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return { error: 'Enter valid sets, reps, weight, and date.' };
  const { error } = await supabase.from('ff_workout_logs').upsert({ user_id: user.id, exercise_id: exerciseId, sets, reps, weight_kg: weight, completed: true, date }, { onConflict: 'user_id,exercise_id,date,plan_id,session_day,slot_index,set_index' });
  if (error) return { error: 'Couldn’t save this exercise. Please try again.' };
  revalidatePath('/dashboard'); revalidatePath('/workout');
  return { success: 'Saved. One rep closer.' };
}
