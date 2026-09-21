'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, LoaderCircle, X } from 'lucide-react';
import { ExerciseImage } from '@/components/exercise-image';
import type { SwapCandidate, LiveSlot } from '@/lib/live-workout';
import type { SwapReason } from '@/lib/workout-engine';
const filters: {value:SwapReason|'';label:string}[] = [
  {value:'',label:'All options'},{value:'too_hard',label:'Too hard'},{value:'too_easy',label:'Too easy'},
  {value:'joint_soreness',label:'Joint soreness'},{value:'missing_equipment',label:'Missing equipment'},
];
export function SwapModal({slot,planId,dayIndex,onClose,onReplace}:{slot:LiveSlot;planId:string;dayIndex:number;onClose:()=>void;onReplace:(candidate:SwapCandidate)=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [reason,setReason]=useState<SwapReason|''>('');
  const [candidates,setCandidates]=useState<SwapCandidate[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');const [warning,setWarning]=useState('');const [attempt,setAttempt]=useState(0);
  useEffect(()=>{dialog.current?.showModal();},[]);
  useEffect(()=>{
    const controller=new AbortController();let live=true;
    setLoading(true);setError('');setWarning('');setCandidates([]);
    const timeout=setTimeout(()=>controller.abort(),15000);
    void (async()=>{
      try {
        const response=await fetch('/api/swap-exercise',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
          body:JSON.stringify({plan_id:planId,session_day:dayIndex,current_exercise_id:slot.exercise.id,current_reps:slot.target.reps,...(reason?{reason}:{})})});
        const body=await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load replacements.');
        if(live){setCandidates(body.candidates);setWarning(body.warning || '');}
      }catch(caught){if(live)setError(controller.signal.aborted?'Request timed out. Try again.':caught instanceof Error?caught.message:'Unable to load replacements.');}
      finally{clearTimeout(timeout);if(live)setLoading(false);}
    })();
    return()=>{live=false;clearTimeout(timeout);controller.abort();};
  },[planId,dayIndex,slot.exercise.id,slot.target.reps,reason,attempt]);
  return <dialog data-theme="light" ref={dialog} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}} aria-labelledby="swap-title" className="max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-3xl overflow-y-auto rounded-2xl border border-line bg-white p-5 text-ink backdrop:bg-black/80 sm:p-7">
    <div className="flex items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-[10px] font-bold tracking-wide text-accent"><ArrowRightLeft size={14}/>Keep the intent. Change the movement.</p><h2 id="swap-title" className="mt-3 text-2xl font-semibold">Swap {slot.exercise.name}</h2><p className="mt-2 text-xs text-muted">Same movement pattern. Equipment you have. Reps adjusted.</p></div><button autoFocus onClick={onClose} aria-label="Close exercise swapper" className="rounded-lg p-2"><X size={21}/></button></div>
    <div aria-label="Reason for swapping" className="my-6 flex flex-wrap gap-2">{filters.map(filter=><button key={filter.value} aria-pressed={reason===filter.value} onClick={()=>setReason(filter.value)} className={`rounded-full border px-3 py-2.5 text-xs ${reason===filter.value?'border-accent bg-accent text-white':'border-line text-ink hover:border-line'}`}>{filter.label}</button>)}</div>
    {warning&&<p role="status" className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-700">{warning}</p>}
    {loading?<div role="status" className="flex items-center justify-center gap-3 py-16 text-sm text-muted"><LoaderCircle className="animate-spin" size={20}/>Finding your alternatives…</div>:error?<div role="alert" className="rounded-xl bg-red-400/10 p-5 text-sm text-red-700">{error}<button onClick={()=>setAttempt(attempt+1)} className="ml-3 underline">Retry</button></div>:candidates.length?<div className="grid gap-4 sm:grid-cols-3">{candidates.map(candidate=><article key={candidate.id} className="overflow-hidden rounded-2xl border border-line bg-white"><ExerciseImage name={candidate.name} url={candidate.gif_url}/><div className="p-4"><span className="text-[9px] font-semibold tracking-wide text-accent">{candidate.movement_pattern.replaceAll('_',' ')}</span><h3 className="mt-2 font-semibold">{candidate.name}</h3><p className="mt-2 text-xs text-muted">{candidate.equipment.join(' · ') || 'Bodyweight'}</p><p className="my-4 text-sm font-medium text-accent">{candidate.target_sets} sets × {candidate.target_reps} reps</p><button onClick={()=>onReplace(candidate)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 text-xs font-bold text-white">Replace<ArrowRightLeft size={14}/></button></div></article>)}</div>:<p className="rounded-xl border border-line p-8 text-center text-sm text-muted">No compatible replacements for this filter. Try another reason or update your equipment.</p>}
  </dialog>;
}
