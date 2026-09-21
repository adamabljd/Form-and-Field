import { matchesStyle, type SessionType, type TrainingStyle } from './training-types';
import { days, patterns, type Exercise } from './training';

export type MovementPattern = typeof patterns[number];
export const swapReasons = ['too_hard', 'too_easy', 'joint_soreness', 'missing_equipment'] as const;
export type SwapReason = typeof swapReasons[number];
export type PlanInput = { equipment: string[]; match_days: string[]; week_number: number; goal?: 'balanced' | 'strength' | 'football'; experience?: 'beginner' | 'intermediate' | 'advanced'; session_minutes?: number; training_days?: string[]; split?: 'hybrid' | 'upper_lower' | 'push_pull'; training_style?: TrainingStyle };
export type Prescription = {
  exercise_id: string; name: string; movement_pattern: string;
  sets: number; reps: number; rest_seconds: number; per_side: boolean;
};
export type TrainingDay = { day: string; focus: SessionType; style?: TrainingStyle; exercises: Prescription[] };
export type WeeklyProgram = {
  version: 1; equipment: string[]; match_days: string[];
  days: TrainingDay[]; warnings: string[];
};
export class EngineError extends Error {
  constructor(message: string, public status = 422) { super(message); }
}

import { compatibleEquipment } from './equipment';
export { compatibleEquipment, normalizeEquipment } from './equipment';

export function parsePlanInput(value: unknown): PlanInput {
  const body = objectBody(value);
  const equipment = stringArray(body.equipment, 'equipment', 160);
  const matches = stringArray(body.match_days, 'match_days', 7).map(day => {
    const match = days.find(item => item.toLowerCase() === day.toLowerCase());
    if (!match) throw new EngineError(`Unknown match day: ${day}`, 400);
    return match;
  });
  const week = body.week_number ?? 1;
  if (!Number.isInteger(week) || (week as number) < 1 || (week as number) > 104) throw new EngineError('week_number must be an integer from 1 to 104.', 400);
  const split = body.split ?? 'hybrid';
  const style = body.training_style ?? 'mixed';
  if (!['hybrid','upper_lower','push_pull'].includes(split as string)) throw new EngineError('Choose a valid program split.',400);
  if (!['mixed','gym','bodyweight','calisthenics'].includes(style as string)) throw new EngineError('Choose a valid training style.',400);
  const goal = body.goal ?? 'balanced';
  const experience = body.experience ?? 'intermediate';
  const minutes = body.session_minutes ?? 45;
  if (!['balanced','strength','football'].includes(goal as string)) throw new EngineError('Choose a valid training goal.',400);
  if (!['beginner','intermediate','advanced'].includes(experience as string)) throw new EngineError('Choose a valid experience level.',400);
  if (![30,45,60].includes(minutes as number)) throw new EngineError('Session duration must be 30, 45, or 60 minutes.',400);
  const trainingDays = body.training_days === undefined ? [...days] : [...new Set(stringArray(body.training_days,'training_days',7))];
  if (trainingDays.some(day=>!days.includes(day)) || trainingDays.length<4) throw new EngineError('Choose at least four available training days.',400);
  return { equipment: [...new Set(equipment)], match_days: [...new Set(matches)], week_number: week as number,
    split:split as PlanInput['split'],training_style:style as TrainingStyle,goal:goal as PlanInput['goal'],experience:experience as PlanInput['experience'],session_minutes:minutes as number,training_days:trainingDays };

}
export function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new EngineError('Expected a JSON object.', 400);
  return value as Record<string, unknown>;
}
function stringArray(value: unknown, field: string, max: number): string[] {
  if (!Array.isArray(value) || value.length > max || value.some(item => typeof item !== 'string' || !item.trim() || item.length > 80)) {
    throw new EngineError(`${field} must be an array of up to ${max} nonempty strings.`, 400);
  }
  return value.map(item => (item as string).trim());
}
export function parseSwapInput(value: unknown) {
  const body = objectBody(value);
  if (typeof body.current_exercise_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.current_exercise_id)) throw new EngineError('current_exercise_id must be a UUID.', 400);
  if (body.reason !== undefined && !swapReasons.includes(body.reason as SwapReason)) throw new EngineError('Unknown swap reason.', 400);
  if (body.plan_id !== undefined && (typeof body.plan_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.plan_id))) throw new EngineError('plan_id must be a UUID.', 400);
  if (body.session_day !== undefined && (!Number.isInteger(body.session_day) || (body.session_day as number)<0 || (body.session_day as number)>6)) throw new EngineError('Invalid session day.',400);
  const reps = body.current_reps ?? 8;
  if (!Number.isInteger(reps) || (reps as number) < 1 || (reps as number) > 100) throw new EngineError('current_reps must be an integer from 1 to 100.', 400);
  return { session_day: body.session_day as number | undefined, plan_id: body.plan_id as string | undefined, current_exercise_id: body.current_exercise_id, reason: body.reason as SwapReason | undefined, current_reps: reps as number };
}

const circularDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 7 - Math.abs(a - b));

/** Exhaustive search over four distinct days; two upper and two lower sessions. */
export function scheduleWeek(matchDays: string[], trainingDays: string[] = days): { schedule: { day: number; focus: TrainingDay['focus'] }[]; warnings: string[] } {
  const matches = matchDays.map(day => days.indexOf(day));
  const available = days.map((_, i) => i).filter(i => !matches.includes(i) && trainingDays.includes(days[i]));
  if (available.length < 4) throw new EngineError('A four-day program requires at least four non-match days. Reduce match days or choose a shorter program.');
  let best: { score: number; upper: number[]; lower: number[] } | undefined;
  for (const a of available) for (const b of available.filter(i => i > a)) {
    // Never place lower-body power on the day before a match, including Sunday→Monday.
    if (matches.some(m => (m - a + 7) % 7 === 1 || (m - b + 7) % 7 === 1)) continue;
    if (circularDistance(a, b) < 2) continue;
    const rest = available.filter(i => i !== a && i !== b);
    for (const c of rest) for (const d of rest.filter(i => i > c)) {
      if (circularDistance(c, d) < 2) continue;
      const lowerPenalty = matches.reduce((sum, m) => sum + [a, b].reduce((n, i) => n + (circularDistance(i, m) === 1 ? 25 : circularDistance(i, m) === 2 ? 3 : 0), 0), 0);
      const spacingPenalty = Math.abs(3 - circularDistance(a, b)) + Math.abs(3 - circularDistance(c, d));
      const score = lowerPenalty + spacingPenalty;
      if (!best || score < best.score) best = { score, upper: [c, d], lower: [a, b] };
    }
  }
  if (!best) throw new EngineError('No four-day schedule fits your matches with lower-body recovery. Adjust match days instead of forcing consecutive power sessions.');
  const warnings: string[] = [];
  if (best.lower.some(i => matches.some(m => (i - m + 7) % 7 === 1))) warnings.push('A power session falls the day after a match. Reduce its volume or rest if recovery is incomplete.');
  return { schedule: [...best.upper.map(day => ({ day, focus: 'upper' as const })), ...best.lower.map(day => ({ day, focus: 'football_power' as const }))].sort((a,b) => a.day - b.day), warnings };
}

function trainingCandidate(exercise: Exercise) {
  return Number.isInteger(exercise.difficulty) && exercise.difficulty >= 1 && exercise.difficulty <= 5
    && patterns.includes(exercise.movement_pattern as MovementPattern)
    && !/stretch|foam|massage|treadmill|elliptical|stationary|isometric|plank|hold|hang\b/i.test(exercise.name);
}
const unilateral = (name: string) => /single[ -]?leg|one[ -]?leg|split squat|lunge|lateral bound/i.test(name);
export function prescription(exercise: Exercise): Prescription {
  const plyo = exercise.movement_pattern === 'plyo';
  return { exercise_id: exercise.id, name: exercise.name, movement_pattern: exercise.movement_pattern,
    sets: plyo ? 2 : 3, reps: plyo ? 6 : exercise.difficulty >= 4 ? 5 : exercise.difficulty >= 3 ? 8 : 12,
    rest_seconds: plyo ? 90 : 75, per_side: unilateral(exercise.name) };
}

export function generateProgram(exercises: Exercise[], input: PlanInput): WeeklyProgram {
  const { schedule, warnings } = scheduleWeek(input.match_days, input.training_days);
  const ceiling = input.experience === 'beginner' ? 2 : input.experience === 'advanced' ? 5 : 4;
  const ideal = input.experience === 'beginner' ? 1 : input.experience === 'advanced' ? 4 : 2;
  const pool = exercises.filter(e => trainingCandidate(e) && e.difficulty <= ceiling && compatibleEquipment(e, input.equipment));
  const usage = new Map<string, number>();
  function choose(pattern: MovementPattern, singleLeg = false): Exercise {
    const candidates = pool.filter(e => e.movement_pattern === pattern && (pattern==='plyo' || matchesStyle(e,input.training_style)) && (!singleLeg || unilateral(e.name)));
    candidates.sort((a,b) => {
      const score = (e: Exercise) => (usage.get(e.id) || 0) * 4 + Math.abs(e.difficulty - ideal) + (e.equipment.length ? 1 : 0);
      return score(a) - score(b) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    });
    if (!candidates.length) throw new EngineError(`No compatible ${singleLeg ? 'single-leg ' : ''}${pattern} exercise is available. Seed the library or adjust equipment.`);
    const selected = candidates[0]; usage.set(selected.id, (usage.get(selected.id) || 0) + 1); return selected;
  }
  let upperCount = 0;
  let lowerCount = 0;
  const sessions = schedule.map(({ day, focus }): TrainingDay => {
    const upperIndex = focus === 'upper' ? upperCount++ : -1;
    const lowerIndex = focus === 'football_power' ? lowerCount++ : -1;
    const sessionFocus: SessionType = input.split === 'upper_lower' ? (focus === 'upper' ? 'upper' : 'lower')
      : input.split === 'push_pull' ? (focus === 'upper' ? (upperIndex===0?'push':'pull') : 'lower') : focus;
    const chosen = sessionFocus === 'push' ? [choose('vertical_push'),choose('horizontal_push'),choose('core')]
      : sessionFocus === 'pull' ? [choose('vertical_pull'),choose('horizontal_pull'),choose('core')]
      : sessionFocus === 'upper' ? (upperIndex===0
        ? [choose('vertical_pull'),choose('horizontal_push'),choose('horizontal_pull'),choose('core')]
        : [choose('vertical_push'),choose('horizontal_pull'),choose('vertical_pull'),choose('core')])
      : sessionFocus === 'lower' ? [choose('knee_dominant',lowerIndex===0),choose('hip_hinge',lowerIndex===1),choose('core')]
      : [choose('plyo'),choose('knee_dominant',true),choose('hip_hinge',true),choose('core')];
    return { day: days[day], focus:sessionFocus, style:sessionFocus==='football_power' ? 'mixed' : input.training_style || 'mixed', exercises: chosen.map(exercise => {
      const target = prescription(exercise);
      const plyo = exercise.movement_pattern === 'plyo';
      const volume = input.session_minutes === 30 ? 2 : input.session_minutes === 60 ? 4 : 3;
      target.sets = plyo ? Math.min(volume,3) : volume;
      if (input.goal === 'strength' && !plyo) { target.reps = Math.max(4,target.reps-2); target.rest_seconds = 90; }
      if (input.goal === 'football' && focus === 'football_power' && input.session_minutes !== 30) target.sets = Math.min(4,target.sets+1);
      if (input.experience === 'beginner') target.sets = Math.min(target.sets,3);
      return target;
    }) };
  });
  return { version: 1, equipment: input.equipment, match_days: input.match_days, days: sessions, warnings };
}

/** Heuristic targets, not a claim of biomechanically equivalent loading. */
export function scaledReps(current: Exercise, candidate: Exercise, reps: number, reason?: SwapReason): number {
  const factor = Math.pow(1.35, current.difficulty - candidate.difficulty);
  const sorenessFactor = reason === 'joint_soreness' ? 0.65 : 1;
  const cap = current.movement_pattern === 'plyo' ? 12 : 20;
  const adjusted = Math.max(3, Math.min(cap, Math.round(reps * factor * sorenessFactor)));
  return reason === 'joint_soreness' ? Math.min(reps, adjusted) : adjusted;
}
export function swapCandidates(current: Exercise, exercises: Exercise[], equipment: string[], reps = 8, reason?: SwapReason) {
  return exercises.filter(e => e.id !== current.id && e.movement_pattern === current.movement_pattern
    && trainingCandidate(e) && compatibleEquipment(e, equipment)
    && (reason === 'too_hard' || reason === 'joint_soreness' ? e.difficulty < current.difficulty : reason === 'too_easy' ? e.difficulty > current.difficulty : true))
    .sort((a,b) => {
      const score = (e: Exercise) => Math.abs(current.difficulty - e.difficulty) * 10 + (e.primary_muscle === current.primary_muscle ? 0 : 2);
      return score(a) - score(b) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    }).slice(0,3).map(exercise => ({ ...exercise, target_sets: reason === 'joint_soreness' ? 2 : 3, target_reps: scaledReps(current, exercise, reps, reason) }));
}
