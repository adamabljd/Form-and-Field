import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { siteOrigin } from '@/lib/supabase/config';
import { safeNext } from '@/lib/auth';
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get('next')), siteOrigin()));
    } catch { /* Show a friendly retry message on the login page. */ }
  }
  return NextResponse.redirect(new URL('/login?error=callback', siteOrigin()));
}
