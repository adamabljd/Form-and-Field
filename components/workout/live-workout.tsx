'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRightLeft, Check, CheckCheck, ChevronRight, Dumbbell, LoaderCircle, Timer, Plus, Minus, Save } from 'lucide-react';
import { ExerciseImage } from '@/components/exercise-image';
import { sessionLabel } from '@/lib/training-types';
import { localDate } from '@/lib/training';
import { uuidPattern, type LiveSlot, type SwapCandidate, type SetResult } from '@/lib/live-workout';
import { RestTimer, TempoModal, useWorkoutSound } from './timers';
import { ExerciseHistory } from './exercise-history';
import { SwapModal } from './swap-modal';

const resultFor=(slot:LiveSlot,index:number):SetResult=>slot.results?.[index] || {reps:slot.target.reps,weight_kg:slot.exercise.equipment.some(item=>/20\s?kg/i.test(item))?20:0};
const isDirty=(slot:LiveSlot,index:number)=>{const result=resultFor(slot,index);return slot.completed.includes(index)&&(!result.saved||result.reps!==result.saved.reps||result.weight_kg!==result.saved.weight_kg);};

type Props = { planId:string;name:string;dayIndex:number;day:string;focus:string;date:string;hasDate:boolean;initialSlots:LiveSlot[];schedule:string[] };
export function LiveWorkout({planId,name,dayIndex,day,focus,date,hasDate,initialSlots,schedule}:Props) {
  const router=useRouter();const sound=useWorkoutSound();
  const [slots,setSlots]=useState(initialSlots);
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState<number[]>([]);
  const saving=useRef(new Set<number>());
  const [errors,setErrors]=useState<Record<number,string>>({});
  const [storageError,setStorageError]=useState('');
  const [swapIndex,setSwapIndex]=useState<number|null>(null);
  const [tempoIndex,setTempoIndex]=useState<number|null>(null);
  const [restView,setRestView]=useState({seconds:0,running:false,finished:false});
  const [rest,setRest]=useState<{id:number;seconds:number}|null>(null);
  const hasUnsaved=slots.some(slot=>slot.completed.some(index=>isDirty(slot,index)));
  const storageKey=`ff-live:${planId}:${dayIndex}:${date}`;

  useEffect(()=>{
    if(!hasDate){router.replace(`/workout/${planId}?day=${dayIndex}&date=${localDate()}`);return;}
    try {
      const cached=JSON.parse(sessionStorage.getItem(storageKey)||'null') as LiveSlot[]|null;
      if(Array.isArray(cached)) setSlots(initialSlots.map((slot,index)=>{
        const saved=cached[index];
        if(!saved?.exercise || !saved.target
          || typeof saved.exercise.id!=='string' || !uuidPattern.test(saved.exercise.id)
          || typeof saved.exercise.name!=='string' || !Array.isArray(saved.exercise.equipment)
          || saved.exercise.movement_pattern!==slot.exercise.movement_pattern
          || !Number.isInteger(saved.target.sets) || saved.target.sets<1 || saved.target.sets>10
          || !Number.isInteger(saved.target.reps) || saved.target.reps<1 || saved.target.reps>100) return slot;
        if(slot.completed.length&&saved.exercise.id!==slot.exercise.id)return slot;
        const count=Math.max(saved.target.sets,...slot.completed.map(n=>n+1));
        return {...slot,exercise:saved.exercise,target:{...saved.target,sets:count},results:Array.from({length:count},(_,i)=>{
          if(slot.completed.includes(i))return resultFor(slot,i);
          const result=saved.results?.[i];
          return result&&Number.isInteger(result.reps)&&result.reps>0&&result.reps<=100&&Number.isFinite(result.weight_kg)&&result.weight_kg>=0&&result.weight_kg<=1000?{reps:result.reps,weight_kg:result.weight_kg}:resultFor({...slot,target:saved.target,exercise:saved.exercise},i);
        })};
      }));
    } catch { /* Ignore stale local selections; completed sets come from Supabase. */ }
    setReady(true);
  },[hasDate,router,planId,dayIndex,storageKey,initialSlots]);

  useEffect(()=>{
    if(!ready)return;
    try {sessionStorage.setItem(storageKey,JSON.stringify(slots.map(slot=>({...slot,completed:[]}))));}
    catch {setStorageError('Local swap memory is unavailable. Completed sets still save to your account.');}
  },[slots,ready,storageKey]);
  useEffect(()=>{
    if(!busy.length&&!hasUnsaved)return;
    const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);
  },[busy.length,hasUnsaved]);

  async function toggleSet(index:number,setIndex:number,saveEdit=false) {
    if(!ready||saving.current.has(index))return;
    const slot=slots[index];const completed=saveEdit||!slot.completed.includes(setIndex);
    const draft=resultFor(slot,setIndex);
    const actual=!completed&&draft.saved?draft.saved:draft;
    if(!Number.isInteger(actual.reps)||actual.reps<1||actual.reps>100||!Number.isFinite(actual.weight_kg)||actual.weight_kg<0||actual.weight_kg>1000){setErrors(current=>({...current,[index]:'Enter 1–100 reps and a weight from 0–1000 kg.'}));return;}
    const previous=slot.completed;
    saving.current.add(index);setBusy([...saving.current]);sound.prime();
    setErrors(current=>({...current,[index]:''}));
    setSlots(current=>current.map((row,i)=>i===index?{...row,completed:completed?[...new Set([...row.completed,setIndex])]:row.completed.filter(n=>n!==setIndex)}:row));
    try {
      const response=await fetch('/api/workout-set',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),
        body:JSON.stringify({plan_id:planId,session_day:dayIndex,slot_index:index,set_index:setIndex,target_sets:slot.target.sets,exercise_id:slot.exercise.id,reps:actual.reps,weight_kg:Math.round(actual.weight_kg*100)/100,date,completed})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.error || 'Unable to save this set.');
      setSlots(current=>current.map((row,i)=>i===index?{...row,results:Array.from({length:row.target.sets},(_,j)=>j===setIndex?{reps:actual.reps,weight_kg:Math.round(actual.weight_kg*100)/100,...(completed?{saved:{reps:actual.reps,weight_kg:Math.round(actual.weight_kg*100)/100}}:{})}:resultFor(row,j))}:row));
      if(completed&&!previous.includes(setIndex)&&!saveEdit)setRest({id:Date.now(),seconds:slot.target.rest_seconds || 60});
    }catch(error){
      setSlots(current=>current.map((row,i)=>i===index?{...row,completed:previous}:row));
      setErrors(current=>({...current,[index]:error instanceof Error && error.name!=='TimeoutError'?error.message:'Save timed out. Tap the set again to retry safely.'}));
    }finally{saving.current.delete(index);setBusy([...saving.current]);}
  }
  function editResult(index:number,setIndex:number,field:'reps'|'weight_kg',value:number) {
    if(saving.current.has(index))return;
    setSlots(current=>current.map((slot,i)=>i===index?{...slot,results:Array.from({length:slot.target.sets},(_,j)=>j===setIndex?{...resultFor(slot,j),[field]:value}:resultFor(slot,j))}:slot));
  }
  function resizeSets(index:number,change:number) {
    const slot=slots[index];const count=slot.target.sets+change;
    if(saving.current.has(index)||count<1||count>10||slot.completed.some(n=>n>=count))return;
    setSlots(current=>current.map((row,i)=>i===index?{...row,target:{...row.target,sets:count},results:Array.from({length:count},(_,j)=>resultFor(row,j))}:row));
  }
  function applyHistoryToSets(index:number,reps:number,weight:number) {
    if(saving.current.has(index))return;
    setSlots(current=>current.map((slot,i)=>i===index?{...slot,results:Array.from({length:slot.target.sets},(_,j)=>slot.completed.includes(j)?resultFor(slot,j):{reps,weight_kg:weight})}:slot));
  }
  function replace(candidate:SwapCandidate) {
    if(swapIndex===null||saving.current.has(swapIndex)||slots[swapIndex].completed.length)return;
    setSlots(current=>current.map((slot,index)=>index===swapIndex?{
      exercise:candidate,completed:[],results:undefined,target:{...slot.target,exercise_id:candidate.id,name:candidate.name,movement_pattern:candidate.movement_pattern,
        sets:candidate.target_sets,reps:candidate.target_reps,per_side:/single[ -]?leg|one[ -]?leg|split squat|lunge|lateral bound/i.test(candidate.name)},
    }:slot));setSwapIndex(null);
  }
  const total=slots.reduce((sum,slot)=>sum+slot.target.sets,0);
  const done=slots.reduce((sum,slot)=>sum+slot.completed.length,0);
  const allDone=total>0&&done===total&&!busy.length&&!Object.values(errors).some(Boolean)&&!hasUnsaved;
  return <div data-theme="light" className="min-h-screen bg-canvas text-ink selection:bg-accent selection:text-white">
    <header className="border-b border-line bg-white/95"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8"><Link href="/workout" onClick={e=>{if(busy.length)e.preventDefault();}} className="flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink"><ArrowLeft size={17}/>Your training</Link><span className="text-sm font-extrabold tracking-tight">form<span className="text-muted">&</span>field<span className="text-accent">.</span></span><span className="hidden items-center gap-2 text-[10px] tracking-wide text-accent sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-accent"/>Live session</span></div></header>
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-8 sm:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold tracking-wide text-accent">{day} / {sessionLabel(focus)}</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Workout</h1><p className="mt-3 text-xs text-muted">{name} <span className="mx-2 text-muted">/</span>{date}</p></div><div className="flex items-center gap-2 rounded-full border border-line px-3 py-2 text-xs text-ink"><Dumbbell size={15} className="text-accent"/>{slots.length} movements</div></div>
      <nav aria-label="Workout days" className="mb-7 flex gap-2 overflow-x-auto pb-1">{schedule.map((label,index)=><button key={label} disabled={busy.length>0||!ready} onClick={()=>router.push(`/workout/${planId}?day=${index}&date=${date}`)} aria-current={index===dayIndex?'page':undefined} className={`flex shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-xs font-semibold ${index===dayIndex?'border-accent/40 bg-accent/10 text-accent':'border-line bg-white text-muted hover:text-ink'}`}><span className="text-[10px] opacity-60">0{index+1}</span>{label}<ChevronRight size={12}/></button>)}</nav>
      {storageError&&<p role="status" className="mb-4 text-xs text-amber-700">{storageError}</p>}
      {allDone&&<div role="status" className="mb-6 flex items-center gap-4 rounded-2xl border border-accent/40 bg-accent/10 p-5"><CheckCheck size={29} className="text-accent"/><div><h2 className="font-semibold text-accent">Session complete</h2><p className="mt-1 text-xs text-muted">All {total} sets saved.</p></div></div>}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]"><div className="space-y-5">{slots.map((slot,index)=>{
        const locked=busy.includes(index)||!ready;const finished=slot.completed.length===slot.target.sets&&!slot.completed.some(n=>isDirty(slot,n));
        return <article key={index} className={`overflow-hidden rounded-2xl border ${finished?'border-accent/40':'border-line'} bg-white`}>
          <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6"><div className="flex gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${finished?'bg-accent/15 text-accent':'bg-canvas text-muted'}`}>{finished?<Check size={18}/>:String(index+1).padStart(2,'0')}</span><div><span className="rounded bg-accent/10 px-2 py-1 text-[9px] font-semibold tracking-wide text-accent">{slot.exercise.movement_pattern.replaceAll('_',' ')}</span><h2 className="mt-3 text-xl font-semibold tracking-tight">{slot.exercise.name}</h2><p className="mt-1.5 text-xs text-muted"><span className="font-bold text-accent">{slot.target.sets} × {slot.target.reps}</span> reps{slot.target.per_side?' per side':''} <span className="mx-1">·</span> {slot.exercise.primary_muscle}</p></div></div><button disabled={locked||slot.completed.length>0} title={slot.completed.length?'Undo completed sets before swapping this slot.':'Find an alternative'} onClick={()=>setSwapIndex(index)} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-xs font-medium text-ink hover:border-accent hover:text-accent"><ArrowRightLeft size={14}/>Swap Exercise</button></div>
          <div className="grid gap-5 px-5 pb-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:px-6 sm:pb-6"><div><ExerciseImage key={slot.exercise.id} name={slot.exercise.name} url={slot.exercise.gif_url} className="rounded-xl"/><div className="mt-3 flex items-center justify-between gap-3"><p className="text-[10px] text-muted">{slot.exercise.equipment.join(' · ')||'Bodyweight'}</p><button onClick={()=>setTempoIndex(index)} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-canvas px-3 py-2.5 text-[11px] font-medium text-accent"><Timer size={14}/>Tempo timer</button></div><ExerciseHistory key={slot.exercise.id} exerciseId={slot.exercise.id} planId={planId} dayIndex={dayIndex} slotIndex={index} date={date} onUse={(reps,weight)=>applyHistoryToSets(index,reps,weight)}/></div>
          <div><div className="mb-3 flex items-center justify-between text-[10px] tracking-wide text-muted"><span>Actual performance</span><span>{slot.completed.length}/{slot.target.sets} sets done</span></div>
          <div className="mb-2 grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 px-3 text-[10px] text-muted"><span>Set</span><span>Reps{slot.target.per_side?' / side':''}</span><span>Weight (kg)</span><span>Done</span></div>
          <div className="space-y-2">{Array.from({length:slot.target.sets},(_,setIndex)=>{
            const checked=slot.completed.includes(setIndex);const result=resultFor(slot,setIndex);const dirty=isDirty(slot,setIndex);
            return <div key={setIndex} className={`rounded-xl border p-3 ${dirty?'border-amber-400/50 bg-amber-400/5':checked?'border-accent/30 bg-accent/10':'border-line/70 bg-white/40'}`}>
              <div className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-2"><span className="text-xs font-semibold text-muted">{setIndex+1}</span>
              <input aria-label={`${slot.exercise.name} set ${setIndex+1} actual reps`} type="number" inputMode="numeric" min={1} max={100} step={1} disabled={locked} value={Number.isFinite(result.reps)?result.reps:''} onChange={e=>editResult(index,setIndex,'reps',e.target.value===''?NaN:Number(e.target.value))} className="min-w-0 w-full rounded-lg border border-line bg-white px-2 py-3 text-sm tabular-nums"/>
              <input aria-label={`${slot.exercise.name} set ${setIndex+1} weight in kilograms`} type="number" inputMode="decimal" min={0} max={1000} step="0.01" disabled={locked} value={Number.isFinite(result.weight_kg)?result.weight_kg:''} onChange={e=>editResult(index,setIndex,'weight_kg',e.target.value===''?NaN:Number(e.target.value))} className="min-w-0 w-full rounded-lg border border-line bg-white px-2 py-3 text-sm tabular-nums"/>
              <input type="checkbox" aria-label={`Complete set ${setIndex+1} of ${slot.exercise.name}`} checked={checked} disabled={locked} onChange={()=>void toggleSet(index,setIndex)} className="h-6 w-6 cursor-pointer accent-accent"/></div>
              {dirty&&<div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] text-amber-700">Unsaved changes</span><button disabled={locked} onClick={()=>void toggleSet(index,setIndex,true)} className="flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-[10px] font-bold text-white"><Save size={12}/>Save edits</button></div>}
            </div>;
          })}</div>
          <div className="mt-3 flex gap-2"><button disabled={locked||slot.target.sets>=10} onClick={()=>resizeSets(index,1)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-line py-2.5 text-xs text-accent"><Plus size={14}/>Add set</button><button disabled={locked||slot.target.sets<=1||slot.completed.includes(slot.target.sets-1)} onClick={()=>resizeSets(index,-1)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-line py-2.5 text-xs text-muted"><Minus size={14}/>Remove last</button></div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted">Check Done to save. 0 kg = no added weight.</p>
          <div aria-live="polite" className="mt-3 min-h-5 text-[11px] text-muted">{busy.includes(index)?<span className="flex items-center gap-2"><LoaderCircle size={13} className="animate-spin"/>Saving set…</span>:errors[index]?<p role="alert" className="text-red-700">{errors[index]} Retry with Done or Save edits.</p>:slot.completed.some(n=>isDirty(slot,n))?<span className="text-amber-700">Save your edited results to update the log.</span>:slot.completed.length?<span className="flex items-center gap-1.5 text-accent"><Check size={13}/>Completed results saved</span>:''}</div>
          {slot.completed.length>0&&<p className="mt-2 text-[10px] leading-relaxed text-muted">Undo completed sets before swapping exercises or removing a completed set.</p>}</div></div>
        </article>;
      })}</div><aside className="space-y-4 lg:sticky lg:top-6"><RestTimer signal={rest} sound={sound} onTick={setRestView}/><section className="rounded-2xl border border-line bg-white p-5"><p className="text-[10px] font-semibold tracking-wide text-muted">Session progress</p><div className="my-4 flex items-baseline gap-2"><span className="text-3xl font-semibold text-accent">{done}</span><span className="text-sm text-muted">/ {total} sets</span></div><div role="progressbar" aria-label="Completed sets" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} className="h-1.5 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-accent transition-all" style={{width:`${total?done/total*100:0}%`}}/></div></section></aside></div>
    </main>
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden"><div className="mx-auto flex max-w-xl items-center justify-between"><span className="text-xs text-muted"><strong className="text-accent">{done}/{total}</strong> sets {busy.length?'· saving…':'· completed'}</span><button onClick={()=>{sound.prime();setRest({id:Date.now(),seconds:60});}} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-3 text-xs font-bold text-white"><Timer size={15}/>{restView.running?`${String(Math.floor(restView.seconds/60)).padStart(2,'0')}:${String(restView.seconds%60).padStart(2,'0')} · restart`:'60s rest'}</button></div>{restView.finished&&<p role="status" className="mt-2 text-[11px] text-accent">Rest complete.</p>}</div>
    {swapIndex!==null&&<SwapModal dayIndex={dayIndex} slot={slots[swapIndex]} planId={planId} onClose={()=>setSwapIndex(null)} onReplace={replace}/>}
    {tempoIndex!==null&&<TempoModal name={slots[tempoIndex].exercise.name} sound={sound} onClose={()=>setTempoIndex(null)}/>}
  </div>;
}
