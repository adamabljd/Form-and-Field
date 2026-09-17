import { requireUser } from '@/lib/auth';
import { loadExercises } from '@/lib/workout-api';
import { ProgramBuilder } from '@/components/programs/program-builder';
import { AppShell } from '@/components/app-shell';
export const dynamic='force-dynamic';
export default async function NewProgramPage({searchParams}:{searchParams:Promise<{mode?:string}>}) {
  const {user,supabase}=await requireUser();
  const [{data:profile,error},exercises,query]=await Promise.all([
    supabase.from('ff_profiles').select('equipment_list,match_days').eq('id',user.id).single(),
    loadExercises(supabase),searchParams,
  ]);
  if(error)throw new Error('Unable to load training preferences.');
  return <AppShell email={user.email}><ProgramBuilder exercises={exercises} initialEquipment={profile.equipment_list} initialMatches={profile.match_days} initialMode={query.mode==='manual'?'manual':'guided'}/></AppShell>;
}
