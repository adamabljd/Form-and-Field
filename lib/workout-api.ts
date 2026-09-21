import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from './supabase/server';
import { isSupabaseConfigured } from './supabase/config';
import { EngineError } from './workout-engine';
import type { Exercise } from './training';

export async function authenticateApi() {
  if (!isSupabaseConfigured()) throw new EngineError('Authentication is not configured.', 503);
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new EngineError('Sign in to use this endpoint.', 401);
  return { supabase, user };
}
export async function readBody(request: Request) {
  const origin = request.headers.get('origin');
  // Same-site cookies and JSON-only POSTs; reject cross-origin browser requests.
  const host = request.headers.get('host');
  if (origin) {
    let originHost: string;
    try { originHost = new URL(origin).host; }
    catch { throw new EngineError('Invalid Origin header.', 400); }
    if (originHost !== host) throw new EngineError('Cross-origin request denied.', 403);
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new EngineError('Use application/json.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new EngineError('JSON body is required.', 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) { await reader.cancel(); throw new EngineError('Request body is too large.', 413); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new EngineError('Invalid JSON.', 400); }
}
export async function loadExercises(supabase: SupabaseClient, pattern?: string): Promise<Exercise[]> {
  const rows: Exercise[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = supabase.from('ff_exercises').select('id,name,movement_pattern,primary_muscle,equipment,gif_url,difficulty').order('id').range(offset, offset + 499);
    if (pattern) query = query.eq('movement_pattern', pattern);
    const { data, error } = await query;
    if (error) throw new EngineError('Unable to load exercise library.', 503);
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export function apiError(error: unknown) {
  if (!(error instanceof EngineError)) console.error('Workout API failed:', error instanceof Error ? error.message : 'Unknown error');
  return NextResponse.json({ error: error instanceof EngineError ? error.message : 'Unable to process your request. Please try again.' },
    { status: error instanceof EngineError ? error.status : 500, headers: { 'Cache-Control': 'private, no-store' } });
}
