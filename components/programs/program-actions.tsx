'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
export function ProgramActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/programs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete program.');
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to delete program.'); setBusy(false); }
  }
  return <div className="mt-4 border-t border-line pt-3">
    {!confirm ? <div className="flex gap-4"><Link href={`/workout/${id}/edit`} className="inline-flex min-h-10 items-center gap-2 text-xs font-medium"><Pencil size={14}/>Edit</Link><button onClick={() => setConfirm(true)} className="inline-flex min-h-10 items-center gap-2 text-xs text-muted"><Trash2 size={14}/>Delete</button></div> : <div className="space-y-3"><p className="text-sm">Delete “{name}”? Your logged exercise history will be kept.</p><div className="flex gap-3"><button disabled={busy} onClick={() => void remove()} className="rounded-lg bg-red-700 px-4 py-2.5 text-xs font-semibold text-white">{busy ? 'Deleting…' : 'Delete program'}</button><button disabled={busy} onClick={() => setConfirm(false)} className="rounded-lg border border-line px-4 py-2.5 text-xs">Cancel</button></div></div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </div>;
}
