'use client';
import { useEffect, useRef, useState } from 'react';
import { CustomExerciseForm } from '@/components/custom-exercise-form';
import { Plus, Search, X } from 'lucide-react';
import { ExerciseImage } from '@/components/exercise-image';
import { patterns, type Exercise } from '@/lib/training';
import { sessionTypes, trainingStyles, matchesSession, matchesStyle } from '@/lib/training-types';
import { compatibleEquipment } from '@/lib/workout-engine';

export function ExercisePicker({onCreated,exercises,equipment,selected,onAdd,onClose,dayLabel,busy=false}:{onCreated:(exercise:Exercise)=>void;exercises:Exercise[];equipment:string[];selected:string[];focus?:string;style?:string;busy?:boolean;dayLabel?:string;onAdd:(exercise:Exercise)=>void;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [sessionFilter,setSessionFilter]=useState("custom");const [styleFilter,setStyleFilter]=useState("mixed");
  const [query,setQuery]=useState('');const [pattern,setPattern]=useState('');const [limit,setLimit]=useState(30);
  const [compatibleOnly,setCompatibleOnly]=useState(false);
  useEffect(()=>{dialog.current?.showModal();},[]);
  const matches=exercises.filter(e=>matchesSession(e,sessionFilter)&&matchesStyle(e,styleFilter)&&(!pattern||e.movement_pattern===pattern)&&`${e.name} ${e.primary_muscle}`.toLowerCase().includes(query.toLowerCase())&&(!compatibleOnly||compatibleEquipment(e,equipment)));
  return <dialog data-theme="light" ref={dialog} aria-labelledby="picker-title" onCancel={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose();}} className="max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-4xl overflow-y-auto rounded-2xl border border-line bg-white p-5 text-ink backdrop:bg-black/75 sm:p-7">
    <div className="flex items-start justify-between gap-3"><div><h2 id="picker-title" className="mt-2 text-2xl font-semibold">{dayLabel?`Add to ${dayLabel}`:'Choose an exercise'}</h2><p className="mt-2 text-xs text-muted">Add up to 10 movements to this session.</p></div><button onClick={onClose} aria-label="Close exercise library" className="rounded-lg p-2"><X size={20}/></button></div>
    <CustomExerciseForm onCreated={exercise=>{onCreated(exercise);setQuery(exercise.name);setSessionFilter("custom");setStyleFilter("mixed");setPattern("");setCompatibleOnly(false);}}/>
    <div className="my-5 flex flex-wrap gap-3"><label className="relative min-w-48 flex-1"><Search size={16} className="absolute left-3 top-3.5 text-muted"/><input autoFocus aria-label="Search exercises" placeholder="Search movements or muscles…" value={query} onChange={e=>{setQuery(e.target.value);setLimit(30);}} className="w-full rounded-xl border border-line bg-white py-3 pl-10 pr-3 text-sm"/></label><select data-ui="select" aria-label="Movement pattern" value={pattern} onChange={e=>{setPattern(e.target.value);setLimit(30);}} className="rounded-xl border border-line bg-white px-3 text-xs"><option value="">All patterns</option>{patterns.map(p=><option key={p} value={p}>{p.replaceAll('_',' ')}</option>)}</select></div>
    <div className="mb-4 flex flex-wrap gap-2"><select data-ui="select" aria-label="Session type filter" value={sessionFilter} onChange={e=>setSessionFilter(e.target.value)} className="rounded-lg border border-line bg-white p-3 text-xs">{sessionTypes.map(type=><option key={type.value} value={type.value}>{type.label}</option>)}</select><select data-ui="select" aria-label="Training style filter" value={styleFilter} onChange={e=>setStyleFilter(e.target.value)} className="rounded-lg border border-line bg-white p-3 text-xs">{trainingStyles.map(type=><option key={type.value} value={type.value}>{type.label}</option>)}</select></div><div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted"><span>{matches.length} exercises</span><label className="flex items-center gap-2"><input type="checkbox" checked={compatibleOnly} onChange={e=>{setCompatibleOnly(e.target.checked);setLimit(30);}} className="accent-accent"/>Only my equipment</label></div>
    <div className="grid gap-2 sm:grid-cols-2">{matches.slice(0,limit).map(exercise=>{
      const added=selected.includes(exercise.id);
      return <article key={exercise.id} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3"><ExerciseImage compact name={exercise.name} url={exercise.gif_url} className="!aspect-square h-12 w-12 shrink-0 rounded-md"/><div className="min-w-0 flex-1"><p className="text-[9px] tracking-wide text-accent">{exercise.movement_pattern.replaceAll('_',' ')}</p><h3 className="my-2 text-sm font-semibold">{exercise.name}</h3><p className="text-[11px] text-muted">{exercise.equipment.join(' · ')||'Bodyweight'} · Level {exercise.difficulty}/5</p><button disabled={busy||added||selected.length>=10} onClick={()=>onAdd(exercise)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-xs font-bold text-white"><Plus size={14}/>{added?'Added':'Add to session'}</button></div></article>;
    })}</div>
    {!matches.length&&<p className="py-12 text-center text-sm text-muted">No matching exercises. Try another filter or update your equipment.</p>}
    {matches.length>limit&&<button onClick={()=>setLimit(limit+30)} className="mt-5 w-full rounded-xl border border-line py-3 text-sm">Show more exercises</button>}
    <button onClick={onClose} className="sticky bottom-0 mt-6 w-full rounded-xl bg-white py-3.5 text-sm font-semibold text-ink shadow-xl">Done</button>
  </dialog>;
}
