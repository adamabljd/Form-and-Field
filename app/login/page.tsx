export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import { Brand } from '@/components/app-shell';
import { AuthForm } from '@/components/auth-form';
import { isSupabaseConfigured } from '@/lib/supabase/config';
export default function LoginPage() { return <main className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-8"><Brand/><section className="flex flex-1 items-center justify-center py-12"><Suspense fallback={<p>Loading…</p>}><AuthForm configured={isSupabaseConfigured()}/></Suspense></section></main>; }
