import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
export async function requireUser() {
  if (!isSupabaseConfigured()) redirect('/login?setup=1');
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  // Insert once on the first authenticated visit; preserve existing preferences.
  // The ff_profiles trigger creates the starter plan in the same transaction.
  const { error: profileError } = await supabase.from('ff_profiles').upsert(
    { id: user.id },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (profileError) throw new Error('Unable to initialize training profile. Check that schema.sql has been applied.');
  return { supabase, user };
}
export function safeNext(value: string | null) {
  return value && /^\/(dashboard|workout|settings|exercises)(\/|\?|$)/.test(value) && !value.includes('\\') ? value : '/dashboard';
}
