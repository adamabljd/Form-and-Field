export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Add your Supabase URL and publishable key to .env.local to enable your account.');
  return { url, key };
}

export function siteOrigin() {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').origin;
}
