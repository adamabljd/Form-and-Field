import Link from 'next/link';
import { Dumbbell, Plus, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { requireUser } from '@/lib/auth';
import { sessionLabel, styleLabel } from '@/lib/training-types';
import { isProgram } from '@/lib/live-workout';
export const dynamic = 'force-dynamic';

export default async function WorkoutPage() {
  const {supabase,user}=await requireUser();
  const {data:plans,error}=await supabase.from('ff_workout_plans').select('id,name,created_at,program')
    .eq('user_id',user.id).not('program','is',null).order('created_at',{ascending:false}).limit(30);
  if(error)throw new Error('Unable to load your programs. Check that the workout-engine migration is applied.');
  const livePlans=plans.filter(plan=>isProgram(plan.program));
  return <AppShell email={user.email}>
    <div className="mb-6"><h1 className="text-2xl font-semibold">Programs</h1></div>
    <div className="mb-8 flex flex-wrap gap-3"><Link href="/workout/new?mode=guided" className="btn"><Sparkles size={16}/>Generate program</Link><Link href="/workout/new?mode=manual" className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium"><Plus size={16}/>Build manually</Link></div>
    <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Saved programs</h2><span className="text-xs text-muted">{livePlans.length} programs</span></div>
    {!livePlans.length?<section className="card px-6 py-10 text-center"><Dumbbell className="mx-auto mb-4 text-muted" size={28}/><h3 className="font-semibold">No programs yet.</h3><p className="mt-2 text-sm text-muted">Generate a program or build one manually.</p></section>:<div className="grid gap-4 xl:grid-cols-2">{livePlans.map(plan=>{
      if(!isProgram(plan.program))return null;
      const program=plan.program;
      return <article key={plan.id} className="card p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{program.days.length} days</p><h3 className="mt-2 text-lg font-semibold">{plan.name}</h3><p className="mt-1 text-[11px] text-muted">Created {new Date(plan.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})} · {program.days.reduce((sum,d)=>sum+d.exercises.length,0)} exercise slots</p></div><Link href={`/workout/${plan.id}`} className="rounded-lg bg-accent px-3 py-2.5 text-xs font-semibold text-white">Start →</Link></div><div className="mt-5 grid grid-cols-2 gap-2">{program.days.map((session,index)=><Link key={`${session.day}:${index}`} href={`/workout/${plan.id}?day=${index}`} className="rounded-xl border border-line bg-canvas p-3 transition hover:border-accent"><span className="text-xs font-semibold">{session.day}</span><span className="mt-1 block text-[10px] text-muted">{sessionLabel(session.focus)} · {styleLabel(session.style||'mixed')} · {session.exercises.length} exercises</span></Link>)}</div>{program.warnings?.map(warning=><p key={warning} className="mt-3 text-[11px] text-amber-700">{warning}</p>)}</article>;
    })}</div>}
  </AppShell>;
}
