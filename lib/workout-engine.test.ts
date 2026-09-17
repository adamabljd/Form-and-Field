import assert from 'node:assert/strict';
import { test } from 'node:test';
import { days, patterns, type Exercise } from './training';
import { compatibleEquipment, generateProgram, parsePlanInput, parseSwapInput, scheduleWeek, scaledReps, swapCandidates } from './workout-engine';
const exercise = (pattern: string, difficulty = 2, overrides: Partial<Exercise> = {}): Exercise => ({
  id: `fixture-${pattern}-${difficulty}`, name: `Exercise ${pattern}`, movement_pattern: pattern,
  primary_muscle: 'test', equipment: [], gif_url: null, difficulty, ...overrides,
});
const pool = patterns.map(pattern => exercise(pattern, 2, {
  name: pattern === 'knee_dominant' ? 'Single-leg squat' : pattern === 'hip_hinge' ? 'Single-leg RDL' : `Exercise ${pattern}`,
}));

test('equipment aliases require every piece and preserve weighted specificity', () => {
  assert.ok(compatibleEquipment(exercise('vertical_push', 2, { equipment: ['Parallel bars','Resistance bands'] }), ['Dip bars','Small Bands']));
  assert.ok(!compatibleEquipment(exercise('vertical_push', 2, { equipment: ['Parallel bars','Resistance bands'] }), ['Dip bars']));
  assert.ok(compatibleEquipment(exercise('hip_hinge', 2, { equipment: ['Barbell'] }), ['20kg Barbell']));
  assert.ok(!compatibleEquipment(exercise('hip_hinge', 2, { equipment: ['20kg Barbell'] }), ['Barbell']));
  assert.ok(!compatibleEquipment(exercise('vertical_pull', 2, { name: 'Pullups' }), []));
  assert.ok(compatibleEquipment(exercise('horizontal_push', 2, { name: 'Deficit Push-Ups', equipment: ['Parallettes'] }), ['Push-up Grips']));
});

test('all weekly match combinations either satisfy constraints or reject', () => {
  let feasible = 0;
  for (let mask = 0; mask < 128; mask++) {
    const matches = days.filter((_, i) => mask & (1 << i));
    let result: ReturnType<typeof scheduleWeek>;
    try { result = scheduleWeek(matches); } catch (error) { assert.match((error as Error).message, /schedule|four-day/); continue; }
    feasible++;
    assert.equal(new Set(result.schedule.map(s => s.day)).size, 4);
    for (const session of result.schedule) {
      assert.ok(!matches.includes(days[session.day]));
      if (session.focus === 'football_power') assert.ok(!matches.includes(days[(session.day + 1) % 7]));
    }
    for (const focus of ['upper', 'football_power']) {
      const sessions = result.schedule.filter(s => s.focus === focus);
      assert.equal(sessions.length, 2);
      const distance = Math.abs(sessions[0].day - sessions[1].day);
      assert.ok(Math.min(distance, 7 - distance) >= 2);
    }
  }
  assert.ok(feasible > 0);
  assert.throws(() => scheduleWeek(['Monday','Tuesday','Wednesday','Thursday']));
});

test('generator creates four balanced prescribed sessions and detects missing equipment', () => {
  const input = parsePlanInput({ equipment: [], match_days: ['saturday'] });
  const program = generateProgram(pool, input);
  assert.equal(program.days.length, 4);
  for (const day of program.days) {
    assert.equal(day.exercises.length, 4);
    if (day.focus === 'football_power') {
      assert.equal(day.exercises[0].movement_pattern, 'plyo');
      assert.equal(day.exercises[1].per_side, true);
      assert.equal(day.exercises[2].per_side, true);
    }
  }
  assert.deepEqual(program, generateProgram([...pool].reverse(), input));
  assert.throws(() => generateProgram(pool.filter(e => e.movement_pattern !== 'vertical_pull'), input), /No compatible/);
});

test('swaps preserve patterns, exclude current and equipment mismatches, cap at three', () => {
  const current = exercise('vertical_push', 4);
  const candidates = [1,2,3].map(level => exercise('vertical_push', level));
  const result = swapCandidates(current, [current, ...candidates, exercise('horizontal_push',1), exercise('vertical_push',1,{id:'missing',equipment:['Machine']})], [], 8, 'too_hard');
  assert.equal(result.length, 3);
  assert.equal(result[0].difficulty, 3);
  assert.ok(result.every(e => e.movement_pattern === 'vertical_push' && e.target_reps >= 8));
  assert.equal(swapCandidates(current, candidates, [], 8, 'too_easy').length, 0);
  assert.ok(scaledReps(current, candidates[0], 8, 'joint_soreness') <= 8);
  assert.equal(scaledReps(exercise('plyo',5),exercise('plyo',1),30),12);
});

test('request validation rejects malformed values and deduplicates match days', () => {
  assert.throws(() => parsePlanInput({equipment:'barbell',match_days:[]}));
  assert.throws(() => parsePlanInput({equipment:[],match_days:['Funday']}));
  assert.throws(() => parsePlanInput({equipment:[],match_days:[],week_number:1.5}));
  assert.equal(parsePlanInput({equipment:[],match_days:['Monday','monday']}).match_days.length,1);
  assert.throws(() => parseSwapInput({ current_exercise_id:'bad' }));
  assert.throws(() => parseSwapInput({ current_exercise_id:'11111111-1111-4111-8111-111111111111', reason:'unsafe',current_reps:8 }));
  assert.equal(parseSwapInput({ current_exercise_id:'11111111-1111-4111-8111-111111111111' }).current_reps,8);
});
