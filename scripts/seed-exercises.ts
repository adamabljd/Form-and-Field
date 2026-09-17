import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnvFile } from 'node:process';
import { createClient } from '@supabase/supabase-js';
import { exerciseEquipment } from '../lib/equipment';
import { patterns, type Exercise } from '../lib/training';

const DATASET_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGE_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const TABLE = 'ff_exercises';
type Pattern = typeof patterns[number];
export type SourceExercise = {
  id: string;
  name: string;
  primaryMuscles: string[];
  equipment: string | null;
  images: string[];
  force: string | null;
  level: string;
  category: string;
};

export const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

// Deterministic, namespaced UUIDs make repeated imports safe without a schema change.
export function exerciseId(name: string): string {
  const hex = createHash('sha256').update(`form-and-field:exercise:${normalizeName(name)}`).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-5${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

// The eight-pattern schema is a coarse taxonomy: isolation, cardio, and
// stretching movements use their closest muscle/mechanics category.
export function movementPattern(exercise: SourceExercise): Pattern {
  const name = exercise.name.toLowerCase().replace(/[-_]/g, ' ');
  const muscle = exercise.primaryMuscles[0].toLowerCase();
  if (exercise.category === 'plyometrics' || /\b(jump|jumps|hops?|bounds?|pogo)\b/.test(name)) return 'plyo';
  if (muscle === 'abdominals' || /\b(plank|dead bug|bird dog)\b/.test(name)) return 'core';
  if (/\b(deadlift|rdl|good morning|hip thrust|glute bridge|nordic)\b/.test(name)) return 'hip_hinge';
  if (/\b(squat|squats|lunge|lunges|step up)\b/.test(name)) return 'knee_dominant';
  if (/\b(pull ups?|pullups?|chin ups?|chinups?|pull down|pulldown)\b/.test(name)) return 'vertical_pull';
  if (/\b(row|rows|rowing)\b/.test(name)) return 'horizontal_pull';
  if (/\b(dip|dips|overhead|military|shoulder press|handstand|pike push)\b/.test(name)) return 'vertical_push';
  if (/\b(push ups?|pushups?|bench press)\b/.test(name)) return 'horizontal_push';
  if (['hamstrings','glutes','lower back'].includes(muscle)) return 'hip_hinge';
  if (['quadriceps','calves','adductors','abductors'].includes(muscle)) return 'knee_dominant';
  if (muscle === 'lats') return 'vertical_pull';
  if (['middle back','traps','biceps','forearms'].includes(muscle)) return 'horizontal_pull';
  if (muscle === 'chest') return 'horizontal_push';
  if (muscle === 'shoulders') return exercise.force === 'pull' ? 'horizontal_pull' : 'vertical_push';
  if (muscle === 'triceps') return 'horizontal_push';
  return exercise.force === 'push' ? 'horizontal_push' : exercise.force === 'pull' ? 'horizontal_pull' : 'core';
}

export function parseDataset(value: unknown): SourceExercise[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Dataset must be a nonempty array.');
  return value.map((item: unknown, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Invalid dataset row ${index}.`);
    const row = item as Record<string, unknown>;
    const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string');
    if (typeof row.id !== 'string' || !row.id || typeof row.name !== 'string' || !row.name.trim()
      || !strings(row.primaryMuscles) || !row.primaryMuscles[0]?.trim() || !strings(row.images)
      || !(row.equipment === null || typeof row.equipment === 'string')
      || !(row.force === null || typeof row.force === 'string')
      || typeof row.level !== 'string' || typeof row.category !== 'string') {
      throw new Error(`Invalid dataset row ${index}; no database writes were attempted.`);
    }
    return row as SourceExercise;
  });
}

export function mapExercise(source: SourceExercise): Exercise {
  const equipmentNames: Record<string, string> = {
    barbell: 'Barbell', dumbbell: 'Dumbbells', bands: 'Resistance bands',
    kettlebells: 'Kettlebells', cable: 'Cable machine', machine: 'Machine',
    'exercise ball': 'Exercise ball', 'medicine ball': 'Medicine ball',
    'e-z curl bar': 'EZ curl bar', 'foam roll': 'Foam roller', other: 'Other equipment',
  };
  const image = source.images[0];
  if (image && (image.startsWith('/') || image.includes('..') || image.includes('://') || image.includes('\\'))) {
    throw new Error(`Invalid image path for ${source.id}.`);
  }
  return {
    id: exerciseId(source.name), name: source.name.trim(),
    primary_muscle: source.primaryMuscles[0], movement_pattern: movementPattern(source),
    equipment: exerciseEquipment(source.name, !source.equipment || source.equipment === 'body only' ? [] : [equipmentNames[source.equipment] || source.equipment]),
    gif_url: image ? IMAGE_BASE + image.split('/').map(encodeURIComponent).join('/') : null,
    difficulty: ({ beginner: 1, intermediate: 3, expert: 5 } as Record<string, number>)[source.level] || 3,
  };
}

export const homeDefaults: Exercise[] = [
  { name: 'Parallel Bar Dips', movement_pattern: 'vertical_push', primary_muscle: 'triceps', equipment: ['Parallel bars'], difficulty: 3 },
  { name: 'Pull-Ups', movement_pattern: 'vertical_pull', primary_muscle: 'lats', equipment: ['Pull-up bar'], difficulty: 3 },
  { name: 'Deficit Push-Ups', movement_pattern: 'horizontal_push', primary_muscle: 'chest', equipment: ['Parallettes'], difficulty: 3 },
  { name: 'Bulgarian Split Squats', movement_pattern: 'knee_dominant', primary_muscle: 'quadriceps', equipment: ['Bench'], difficulty: 3 },
  { name: 'Single-Leg RDLs (20kg Barbell)', movement_pattern: 'hip_hinge', primary_muscle: 'hamstrings', equipment: ['20kg Barbell'], difficulty: 3 },
  { name: 'Nordic Hamstring Curls', movement_pattern: 'hip_hinge', primary_muscle: 'hamstrings', equipment: ['Secure ankle anchor'], difficulty: 5 },
  { name: 'Pogo Jumps', movement_pattern: 'plyo', primary_muscle: 'calves', equipment: [], difficulty: 2 },
  { name: 'Lateral Bounds', movement_pattern: 'plyo', primary_muscle: 'glutes', equipment: [], difficulty: 3 },
].map(row => ({ ...row, id: exerciseId(row.name), gif_url: null }));

export function buildSeed(source: SourceExercise[]): Exercise[] {
  const rows = new Map<string, Exercise>();
  for (const exercise of source) rows.set(normalizeName(exercise.name), mapExercise(exercise));
  // Defaults override matching mirror records; reuse an image only for an exact
  // normalized name match, never illustrate a different variant as this movement.
  for (const exercise of homeDefaults) {
    const key = normalizeName(exercise.name);
    rows.set(key, { ...exercise, gif_url: rows.get(key)?.gif_url ?? null });
  }
  return [...rows.values()];
}

export async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--dry-run')) throw new Error('Usage: npm run db:seed -- [--dry-run]');
  const dryRun = args.includes('--dry-run');
  if (existsSync('.env.local')) loadEnvFile('.env.local');
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!dryRun && (!url || !key)) throw new Error('Set SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) and NEXT_PUBLIC_SUPABASE_URL in .env.local. Never prefix the secret with NEXT_PUBLIC_. Use --dry-run to preview without credentials.');
  if (!dryRun && key?.startsWith('sb_publishable_')) throw new Error('Seeding requires a server-only secret key, not a publishable key.');

  const response = await fetch(DATASET_URL, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Dataset download failed: HTTP ${response.status}.`);
  const source = parseDataset(await response.json());
  const rows = buildSeed(source);
  console.log(`Fetched ${source.length} exercises; prepared ${rows.length} unique rows including ${homeDefaults.length} home defaults for ${TABLE}.`);
  if (dryRun) {
    console.log('Dry run: no database connection or writes.');
    console.table(patterns.map(pattern => ({ pattern, count: rows.filter(row => row.movement_pattern === pattern).length })));
    return;
  }
  const supabase = createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(30_000) }) },
  });
  // Keep existing IDs so workout logs, substitutions, and the starter session
  // remain valid. Paginate rather than assuming the server's default row limit.
  const existing = new Map<string, { id: string; gif_url: string | null }>();
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from(TABLE).select('id,name,gif_url').order('id').range(offset, offset + 499);
    if (error) throw new Error(`Cannot read ${TABLE}: ${error.message}`);
    for (const row of data) {
      const name = normalizeName(row.name);
      if (existing.has(name)) throw new Error(`Duplicate existing name: ${row.name}. Resolve duplicate library entries before seeding; no writes were attempted.`);
      existing.set(name, row);
    }
    if (data.length < 500) break;
  }
  const prepared = rows.map(row => {
    const match = existing.get(normalizeName(row.name));
    return match ? { ...row, id: match.id, gif_url: row.gif_url ?? match.gif_url } : row;
  });
  for (let offset = 0; offset < prepared.length; offset += 100) {
    const batch = prepared.slice(offset, offset + 100);
    const { error } = await supabase.from(TABLE).upsert(batch, { onConflict: 'id' });
    if (error) throw new Error(`Batch ${Math.floor(offset / 100) + 1} failed: ${error.message}. Earlier batches may have committed; rerun safely after resolving the error.`);
    console.log(`Seeded ${Math.min(offset + batch.length, prepared.length)}/${prepared.length}.`);
  }
  console.log(`Done. ${TABLE} updated; no exercises or user records deleted.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(`Seed failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exitCode = 1;
  });
}
