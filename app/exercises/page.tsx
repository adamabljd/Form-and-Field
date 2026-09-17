export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { ExerciseLibrary } from '@/components/exercise-library';
export default async function ExercisesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from('ff_exercises').select('*').order('name');
  if (error) throw new Error('Unable to load exercises.');
  const { category } = await searchParams;
  return <AppShell email={user.email}><p className="eyebrow text-accent">Move well. Get stronger.</p><h1 className="mb-2 mt-2 text-3xl font-semibold tracking-tight">Your movement toolkit.</h1><p className="mb-8 text-sm text-muted">Find the foundations for your next session.</p><Link href="/workout/new?mode=manual" className="btn mb-6">Build a program from the library →</Link><ExerciseLibrary exercises={data || []} initialCategory={['Upper body','Lower body','Core & control'].includes(category || '') ? category : undefined}/></AppShell>;
}
