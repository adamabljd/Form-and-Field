import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSeed, exerciseId, homeDefaults, mapExercise, movementPattern, parseDataset, type SourceExercise } from './seed-exercises';
const source = (overrides: Partial<SourceExercise> = {}): SourceExercise => ({ id: 'Pushups', name: 'Pushups', primaryMuscles: ['chest'], equipment: 'body only', images: ['Pushups/0.jpg'], force: 'push', level: 'beginner', category: 'strength', ...overrides });

test('maps source fields to the database shape', () => {
  const row = mapExercise(source());
  assert.equal(row.primary_muscle, 'chest');
  assert.deepEqual(row.equipment, []);
  assert.equal(row.gif_url, 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/0.jpg');
  assert.equal(row.difficulty, 1);
  assert.equal(mapExercise(source({ equipment: 'barbell', level: 'expert', images: [] })).equipment[0], 'Barbell');
  assert.equal(mapExercise(source({ level: 'expert' })).difficulty, 5);
  assert.equal(mapExercise(source({ images: [] })).gif_url, null);
});
test('classifies mechanics before misleading muscle or force labels', () => {
  for (const [name, muscle, expected] of [
    ['Pullups', 'lats', 'vertical_pull'], ['Bent Over Row', 'lats', 'horizontal_pull'],
    ['Pike Push-ups', 'shoulders', 'vertical_push'], ['Pushups', 'chest', 'horizontal_push'],
    ['Bulgarian Split Squats', 'quadriceps', 'knee_dominant'], ['Romanian Deadlift', 'hamstrings', 'hip_hinge'],
    ['Pogo Jumps', 'calves', 'plyo'], ['Sit-Up', 'abdominals', 'core'],
  ]) assert.equal(movementPattern(source({ name, primaryMuscles: [muscle] })), expected, name);
});
test('IDs and merged defaults are deterministic without duplicate pull-ups', () => {
  assert.equal(exerciseId('Pull-Ups'), exerciseId('Pullups'));
  assert.match(exerciseId('Pull-Ups'), /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-a[a-f0-9]{3}-[a-f0-9]{12}$/);
  const rows = buildSeed([source({ name: 'Pullups', primaryMuscles: ['lats'], images: ['Pullups/0.jpg'] })]);
  assert.equal(rows.length, 8);
  assert.equal(rows.find(row => row.name === 'Pull-Ups')?.gif_url?.endsWith('Pullups/0.jpg'), true);
  assert.deepEqual(rows.find(row => row.name === 'Pull-Ups')?.equipment, ['Pull-up bar']);
  for (const item of homeDefaults) assert.ok(rows.some(row => row.name === item.name));
  assert.deepEqual(rows, buildSeed([source({ name: 'Pullups', primaryMuscles: ['lats'], images: ['Pullups/0.jpg'] })]));
});
test('rejects malformed records and image paths before writing', () => {
  assert.throws(() => parseDataset({ exercises: [] }));
  assert.throws(() => parseDataset([source({ primaryMuscles: [] })]));
  assert.throws(() => mapExercise(source({ images: ['../secret'] })));
  assert.deepEqual(parseDataset([source()]), [source()]);
});
