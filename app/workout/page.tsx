import Link from 'next/link';
import { ArrowRight, Dumbbell, Plus, Sparkles } from 'lucide-react';
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
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow text-accent">Your training starts here</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Your programs.</h1><p className="mt-2 text-sm text-muted">Create your routine. Make it yours. Show up for the next session.</p></div><Link href="/workout/new" className="btn"><Plus size={16}/>Create a program</Link></div>
    <section className="mb-8 grid gap-4 md:grid-cols-2"><Link href="/workout/new?mode=guided" className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-white transition hover:border-lime-500"><Sparkles size={25} className="mb-5 text-lime-400"/><p className="text-[10px] font-bold uppercase tracking-widest text-lime-400">Guided program</p><h2 className="mt-2 text-xl font-semibold">Answer a few questions.<br/>Get a plan built around you.</h2><p className="mt-3 max-w-sm text-xs leading-relaxed text-zinc-400">Your goal, experience, equipment, and match schedule become a balanced four-day program.</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-lime-300">Generate my program<ArrowRight size={16}/></span></Link><Link href="/workout/new?mode=manual" className="group card p-6 transition hover:border-accent"><Dumbbell size={25} className="mb-5 text-accent"/><p className="eyebrow">Manual program</p><h2 className="mt-2 text-xl font-semibold">You pick the movements.<br/>You set the targets.</h2><p className="mt-3 max-w-sm text-xs leading-relaxed text-muted">Browse the exercise library and build each training day. Set your reps, sets, and rest exactly how you want them.</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">Build it myself<ArrowRight size={16}/></span></Link></section>
    <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Saved programs</h2><span className="text-xs text-muted">{livePlans.length} programs</span></div>
    {!livePlans.length?<section className="card px-6 py-10 text-center"><Dumbbell className="mx-auto mb-4 text-muted" size={28}/><h3 className="font-semibold">Your first program is one step away.</h3><p className="mt-2 text-sm text-muted">Choose either creation option above. Review your program before you save it.</p></section>:<div className="grid gap-4 xl:grid-cols-2">{livePlans.map(plan=>{
      if(!isProgram(plan.program))return null;
      const program=plan.program;
      return <article key={plan.id} className="card p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">4-day program</p><h3 className="mt-2 text-lg font-semibold">{plan.name}</h3><p className="mt-1 text-[11px] text-muted">Created {new Date(plan.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})} · {program.days.reduce((sum,d)=>sum+d.exercises.length,0)} exercise slots</p></div><Link href={`/workout/${plan.id}`} className="rounded-lg bg-ink px-3 py-2.5 text-xs font-semibold text-white">Start →</Link></div><div className="mt-5 grid grid-cols-2 gap-2">{program.days.map((session,index)=><Link key={`${session.day}:${index}`} href={`/workout/${plan.id}?day=${index}`} className="rounded-xl border border-line bg-canvas p-3 transition hover:border-accent"><span className="text-xs font-semibold">{session.day}</span><span className="mt-1 block text-[10px] text-muted">{sessionLabel(session.focus)} · {styleLabel(session.style||'mixed')} · {session.exercises.length} exercises</span></Link>)}</div>{program.warnings?.map(warning=><p key={warning} className="mt-3 text-[11px] text-amber-700">{warning}</p>)}</article>;
    })}</div>}
  </AppShell>;
}
