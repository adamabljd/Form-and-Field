'use client';
import { useEffect, useState } from 'react';
import { History, LoaderCircle } from 'lucide-react';
type Log={id:string;date:string;plan_id:string|null;session_day:number|null;slot_index:number|null;set_index:number|null;sets:number;reps:number;weight_kg:number};
export function ExerciseHistory({exerciseId,planId,dayIndex,slotIndex,date,onUse}:{exerciseId:string;planId:string;dayIndex:number;slotIndex:number;date:string;onUse:(reps:number,weight:number)=>void}) {
  const [logs,setLogs]=useState<Log[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let live=true;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
    setLoading(true);setError('');setLogs([]);
    void(async()=>{try{
      const query=new URLSearchParams({exercise_id:exerciseId,plan_id:planId,day:String(dayIndex),slot:String(slotIndex),date});
      const response=await fetch(`/api/exercise-history?${query}`,{signal:controller.signal});const body=await response.json();
      if(!response.ok)throw new Error(body.error||'Unable to load history.');
      if(live)setLogs(body.logs);
    }catch(caught){if(live)setError(caught instanceof Error&&caught.name!=='AbortError'?caught.message:'History request timed out.');}
    finally{clearTimeout(timeout);if(live)setLoading(false);}})();
    return()=>{live=false;clearTimeout(timeout);controller.abort();};
  },[exerciseId,planId,dayIndex,slotIndex,date,retry]);
  const sessions=new Map<string,Log[]>();
  for(const row of logs){const key=`${row.date}:${row.plan_id||row.id}:${row.session_day}:${row.slot_index}`;sessions.set(key,[...(sessions.get(key)||[]),row]);}
  return <details className="mt-4 rounded-xl border border-zinc-700/70 bg-zinc-950/40 p-4" open><summary className="cursor-pointer text-xs font-semibold text-zinc-300"><History size={14} className="mr-2 inline text-lime-300"/>Previous performance</summary>
    {loading?<p role="status" className="mt-4 flex items-center gap-2 text-xs text-zinc-500"><LoaderCircle size={13} className="animate-spin"/>Loading your history…</p>:error?<p role="alert" className="mt-3 text-xs text-red-300">{error}<button onClick={()=>setRetry(retry+1)} className="ml-2 underline">Retry</button></p>:!logs.length?<p className="mt-3 text-xs text-zinc-500">No previous completed sets for this exercise yet.</p>:<div className="mt-4 max-h-72 space-y-4 overflow-y-auto">{[...sessions.entries()].map(([key,rows],index)=><section key={key}><div className="mb-2 flex items-center justify-between gap-2 text-[11px]"><span className="font-semibold text-zinc-300">{rows[0].date}{index===0?' · Latest':''}</span><span className="text-zinc-500">{rows.reduce((sum,row)=>sum+row.sets,0)} sets</span></div><div className="space-y-1.5">{rows.map(row=><div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs"><span className="text-zinc-400">{row.set_index===null?`${row.sets} sets`:`Set ${row.set_index+1}`} · <span className="text-white">{row.reps} reps × {Number(row.weight_kg)} kg</span></span><button onClick={()=>onUse(row.reps,Number(row.weight_kg))} className="text-[10px] font-semibold text-lime-300">Use for unfinished sets</button></div>)}</div></section>)}<p className="text-[10px] text-zinc-500">Showing up to 60 prior log entries across your programs. 0 kg means no added load.</p></div>}
  </details>;
}
