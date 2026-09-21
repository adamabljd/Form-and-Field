'use client';
import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { patterns, type Exercise } from '@/lib/training';
import { EquipmentSelector } from './equipment-selector';

export function CustomExerciseForm({ onCreated, dark = false }: { onCreated: (exercise: Exercise) => void; dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/exercises', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), primary_muscle: data.get('muscle'), movement_pattern: data.get('pattern'), difficulty: Number(data.get('difficulty')), gif_url: data.get('image'), equipment }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to create exercise.');
      onCreated(body.exercise); form.reset(); setEquipment([]); setOpen(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to create exercise.'); }
    finally { setBusy(false); }
  }
  return <div data-theme={dark ? 'dark' : 'light'} className="mb-5">
    <button type="button" aria-expanded={open} disabled={busy} onClick={() => setOpen(!open)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold"><Plus size={16}/>{open ? 'Close custom exercise' : 'Create your own exercise'}</button>
    {open && <form onSubmit={save} className={`mt-4 space-y-4 rounded-2xl border p-5 ${dark ? 'border-zinc-700 bg-zinc-900' : 'border-line bg-white'}`}>
      <p className="text-sm opacity-70">Saved to your private library. Add it to any compatible session.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs">Exercise name<input name="name" required maxLength={120} className="field mt-2" placeholder="My exercise"/></label>
        <label className="text-xs">Primary muscle<input name="muscle" required maxLength={80} className="field mt-2" placeholder="e.g. quadriceps"/></label>
        <label className="text-xs">Movement pattern<select name="pattern" data-ui="select" className="mt-2 w-full">{patterns.map(pattern => <option key={pattern} value={pattern}>{pattern.replaceAll('_', ' ')}</option>)}</select></label>
        <label className="text-xs">Difficulty<select name="difficulty" data-ui="select" defaultValue="2" className="mt-2 w-full">{[1,2,3,4,5].map(level => <option key={level} value={level}>Level {level}</option>)}</select></label>
      </div>
      <label className="block text-xs">Image or GIF URL (optional)<input name="image" type="url" maxLength={2000} placeholder="https://…" className="field mt-2"/></label>
      <EquipmentSelector dark={dark} value={equipment} onChange={setEquipment} disabled={busy}/>
      {error && <p role="alert" className={dark ? 'text-sm text-red-300' : 'text-sm text-red-700'}>{error}</p>}
      <button disabled={busy} className="btn">{busy ? 'Saving…' : 'Save custom exercise'}</button>
    </form>}
  </div>;
}
