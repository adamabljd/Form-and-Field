import type { Exercise } from './training';
import type { WeeklyProgram, Prescription } from './workout-engine';

export type SetResult = { reps: number; weight_kg: number; saved?: { reps:number; weight_kg:number } };
export type LiveSlot = { target: Prescription; exercise: Exercise; completed: number[]; results?: SetResult[] };
export type SavedSet = { exercise_id: string; slot_index: number; set_index: number; target_sets: number; reps: number; weight_kg: number; completed: boolean };
export type SwapCandidate = Exercise & { target_sets: number; target_reps: number };
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
export function isProgram(value: unknown): value is WeeklyProgram {
  if (!value || typeof value !== 'object') return false;
  const p = value as WeeklyProgram;
  return p.version === 1 && Array.isArray(p.equipment) && p.equipment.every(e => typeof e === 'string')
    && Array.isArray(p.days) && p.days.length === 4 && p.days.every(day => typeof day.day === 'string'
      && Array.isArray(day.exercises) && day.exercises.length > 0 && day.exercises.every(e =>
        typeof e.exercise_id === 'string' && uuidPattern.test(e.exercise_id) && Number.isInteger(e.sets) && e.sets > 0 && e.sets <= 10 && Number.isInteger(e.reps) && e.reps > 0 && e.reps <= 100));
}
