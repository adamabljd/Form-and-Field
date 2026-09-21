'use client';
import { useActionState, useState } from 'react';
import { saveProfile } from '@/app/actions';
import { days } from '@/lib/training';
import { EquipmentSelector } from '@/components/equipment-selector';
import { Check, Save } from 'lucide-react';
export function SettingsForm({ profile }: { profile: { equipment_list: string[]; match_days: string[]; fitness_goal: string } }) {
  const [equipment,setEquipment] = useState(profile.equipment_list);
  const [state, action, pending] = useActionState(saveProfile, {});
  return <form action={action} className="card max-w-3xl space-y-8 p-6 sm:p-8"><div><h2 className="font-semibold">Training goal</h2><label className="text-xs">Fitness goal<select data-ui="select" className="field mt-2" name="fitness_goal" defaultValue={profile.fitness_goal}>{['Hybrid fitness','Build strength','Football performance','Improve endurance'].map(goal=><option key={goal}>{goal}</option>)}</select></label></div><fieldset><legend className="font-semibold">Equipment</legend><p className="mb-4 mt-1 text-xs text-muted">Select what you have. Bodyweight is always an option.</p><EquipmentSelector name="equipment" value={equipment} onChange={setEquipment} disabled={pending}/></fieldset><fieldset><legend className="font-semibold">Match days</legend><div className="flex flex-wrap gap-2">{days.map(day=><label key={day} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-3 text-xs has-[:checked]:border-accent has-[:checked]:bg-emerald-50"><input type="checkbox" name="match_days" value={day} defaultChecked={profile.match_days.includes(day)} className="accent-accent"/>{day.slice(0,3)}</label>)}</div></fieldset>{state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}{state.success && <p role="status" className="flex items-center gap-2 text-sm text-green-700"><Check size={16}/>{state.success}</p>}<button disabled={pending} className="btn"><Save size={15}/>{pending ? 'Saving…' : 'Save preferences'}</button></form>;
}
