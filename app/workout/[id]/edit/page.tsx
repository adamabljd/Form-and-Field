import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { loadExercises } from '@/lib/workout-api';
import { isProgram, uuidPattern } from '@/lib/live-workout';
import { ProgramBuilder } from '@/components/programs/program-builder';
import { AppShell } from '@/components/app-shell';
export const dynamic = 'force-dynamic';
export default async function EditProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  const { user, supabase } = await requireUser();
  const { data: plan, error } = await supabase.from('ff_workout_plans').select('id,name,program').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (error) throw new Error('Unable to load program.');
  if (!plan || !isProgram(plan.program)) notFound();
  const exercises = await loadExercises(supabase);
  return <AppShell email={user.email}><ProgramBuilder exercises={exercises} initialEquipment={plan.program.equipment} initialMatches={plan.program.match_days} initialMode="manual" editingPlan={plan}/></AppShell>;
}
