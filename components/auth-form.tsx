'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, LoaderCircle, Mail, LockKeyhole } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
export function AuthForm({ configured }: { configured: boolean }) {
  const [mode, setMode] = useState<'login'|'signup'>('login');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const params = useSearchParams();
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true);
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email')).trim(); const password = String(data.get('password'));
    const requested = params.get('next');
    const next = requested && /^\/(dashboard|workout|settings|exercises)(\/|\?|$)/.test(requested) && !requested.includes('\\') ? requested : '/dashboard';
    try {
      const supabase = createClient();
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` } });
        if (error) throw error;
        if (!data.session) { setMessage('Check your inbox for a confirmation link. Open it in this browser to finish creating your account.'); return; }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      router.replace(next); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="w-full max-w-sm"><p className="eyebrow text-accent">Your next chapter starts here</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">{mode === 'login' ? 'Back to your better game.' : 'Built for your kind of athlete.'}</h1><p className="mb-7 mt-3 text-sm leading-relaxed text-muted">{mode === 'login' ? 'Sign in and pick up where you left off.' : 'A little stronger. A little sharper. Every day.'}</p>
    <div role="tablist" aria-label="Account access" className="mb-7 flex rounded-lg bg-canvas p-1">{(['login','signup'] as const).map(tab=><button key={tab} role="tab" aria-selected={mode === tab} aria-controls="auth-panel" id={`${tab}-tab`} disabled={busy} onClick={()=>{setMode(tab);setError('');setMessage('');}} className={`flex-1 rounded-md py-2.5 text-xs font-semibold ${mode === tab ? 'bg-white shadow-sm' : 'text-muted'}`}>{tab === 'login' ? 'Sign in' : 'Create account'}</button>)}</div>
    {!configured && <p className="mb-5 rounded-lg border border-[#ead5ba] bg-[#fcf4e5] p-3 text-xs leading-relaxed text-[#8c6c36]">Account setup is not connected yet. Add the Supabase credentials to .env.local and apply schema.sql to enable authentication.</p>}
    <form id="auth-panel" role="tabpanel" aria-labelledby={`${mode}-tab`} onSubmit={submit} className="space-y-5"><label className="block text-xs font-medium">Email address<div className="relative mt-2"><Mail size={16} className="absolute left-3 top-3.5 text-muted"/><input type="email" name="email" placeholder="you@example.com" required autoComplete="email" maxLength={254} className="field pl-10"/></div></label><label className="block text-xs font-medium">Password<div className="relative mt-2"><LockKeyhole size={16} className="absolute left-3 top-3.5 text-muted"/><input type={visible ? 'text' : 'password'} name="password" required minLength={mode === 'signup' ? 8 : 1} maxLength={128} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="field pl-10 pr-12"/><button type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={()=>setVisible(!visible)} className="absolute right-3 top-3.5 text-muted">{visible ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
      {(error || params.get('error') === 'callback') && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error || 'This confirmation link is invalid or expired. Please sign in or request a new confirmation by signing up again.'}</p>}
      {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-xs leading-relaxed text-green-800">{message}</p>}
      <button disabled={busy || !configured} className="btn w-full bg-accent hover:bg-emerald-800">{busy ? <LoaderCircle size={17} className="animate-spin"/> : <>{mode === 'login' ? 'Sign in' : 'Create your account'}<ArrowRight size={16}/></>}</button>
    </form><p className="mt-8 text-center text-xs text-muted">Just looking around? <Link href="/" className="font-semibold text-ink underline underline-offset-4">Explore the preview</Link></p></div>;
}
