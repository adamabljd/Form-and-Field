export const dynamic = 'force-dynamic';
import { requireUser } from '@/lib/auth';
import { AppShell } from '@/components/app-shell';
import { SettingsForm } from '@/components/settings-form';
export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from('ff_profiles').select('equipment_list,match_days,fitness_goal').eq('id',user.id).single();
  if (error) throw new Error('Unable to load your preferences.');
  return <AppShell email={user.email}><p className="eyebrow text-accent">Make it your own</p><h1 className="mb-2 mt-2 text-3xl font-semibold tracking-tight">Your training, your way.</h1><p className="mb-8 text-sm text-muted">Build your routine around the equipment and time you have.</p><SettingsForm profile={data}/><section className="card mt-6 flex max-w-3xl flex-wrap items-center justify-between gap-4 p-6"><div><h2 className="text-sm font-semibold">Your account</h2><p className="mt-1 text-xs text-muted">{user.email}</p></div><form action="/auth/signout" method="post"><button className="rounded-lg border border-line px-4 py-2 text-xs font-medium">Sign Out</button></form></section></AppShell>;
}
