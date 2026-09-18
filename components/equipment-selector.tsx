'use client';
import { useState } from 'react';
import { Search, Dumbbell, X } from 'lucide-react';
import { equipmentGroups, gymPreset, normalizeEquipment } from '@/lib/equipment';

export function EquipmentSelector({value,onChange,extra=[],dark=false,disabled=false,name}:{value:string[];onChange:(items:string[])=>void;extra?:string[];dark?:boolean;disabled?:boolean;name?:string}) {
  const [query,setQuery]=useState('');
  const known=new Set(equipmentGroups.flatMap(group=>group.items));
  const additions=[...new Set([...extra,...value])].filter(item=>!known.has(item));
  const groups=additions.length?[...equipmentGroups,{name:'Additional library equipment',items:additions}]:equipmentGroups;
  const panel=dark?'border-zinc-700 bg-zinc-900 text-zinc-300':'border-line bg-white text-ink';
  function select(items:string[]){onChange([...new Set(items)]);}
  return <div data-theme={dark?"dark":"light"} className="space-y-4">
    {name&&value.map(item=><input key={item} type="hidden" name={name} value={item}/>)}
    <div className="flex flex-wrap gap-2"><label className="relative min-w-48 flex-1"><Search aria-hidden="true" size={17} className="pointer-events-none absolute left-3.5 top-3.5 opacity-50"/><input aria-label="Search equipment" placeholder="Search machines or equipment…" value={query} onChange={e=>setQuery(e.target.value)} className={`min-h-12 w-full rounded-xl border py-3 pl-10 pr-3 text-sm shadow-sm ${panel}`}/></label><button type="button" disabled={disabled} onClick={()=>select([...value,...gymPreset])} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold ${dark?"border-lime-400/30 bg-lime-400/10 text-lime-300 hover:bg-lime-400/20":"border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}><Dumbbell size={15}/>Gym preset</button><button type="button" disabled={disabled} onClick={()=>onChange([])} className={`inline-flex min-h-12 items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium ${panel}`}><X size={14}/>Clear</button></div>
    <p className={`text-xs ${dark?'text-zinc-400':'text-muted'}`}><span className={`mr-2 inline-flex rounded-full px-2.5 py-1 font-semibold ${dark?"bg-lime-400/10 text-lime-300":"bg-emerald-100 text-emerald-800"}`}>{value.length} selected</span>The gym preset is a starting point—uncheck anything your gym does not have.</p>
    {!groups.some(group=>group.items.some(item=>`${group.name} ${item}`.toLowerCase().includes(query.toLowerCase())))&&<p className="text-sm opacity-60">No equipment matches that search.</p>}
    <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">{groups.map(group=>{
      const items=group.items.filter(item=>`${group.name} ${item}`.toLowerCase().includes(query.toLowerCase()));
      if(!items.length)return null;
      const all=items.every(item=>value.includes(item));
      return <details key={`${group.name}:${Boolean(query)}`} open={Boolean(query)||items.some(item=>value.includes(item))} className={`equipment-group rounded-xl border p-4 ${panel}`}><summary className="cursor-pointer text-sm font-semibold">{group.name}<span className="ml-2 rounded-md bg-black/5 px-2 py-1 text-[10px] font-semibold tabular-nums opacity-70">{group.items.filter(item=>value.includes(item)).length}/{group.items.length}</span></summary><button type="button" disabled={disabled} onClick={()=>select(all?value.filter(item=>!items.includes(item)):[...value,...items])} className={`mb-3 mt-3 text-xs underline underline-offset-4 ${dark?'text-lime-300':'text-accent'}`}>{all?'Deselect':'Select'} visible group</button><div className="grid gap-2 sm:grid-cols-2">{items.map(item=>{
        const checked=value.includes(item);
        return <label key={item} className={`equipment-option flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-xs font-medium leading-relaxed ${checked?(dark?'border-lime-400/50 bg-lime-400/10':'border-accent bg-emerald-50'):panel}`}><input disabled={disabled} type="checkbox" checked={checked} onChange={()=>select(checked?value.filter(v=>v!==item):[...value,item])} className={dark?'accent-lime-400':'accent-accent'}/>{item}{!checked&&value.some(v=>normalizeEquipment(v)===normalizeEquipment(item))&&<span className="ml-auto opacity-50">Equivalent selected</span>}</label>;
      })}</div></details>;
    })}</div>
  </div>;
}
