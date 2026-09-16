import { NextResponse, type NextRequest } from 'next/server';
import { siteOrigin } from '@/lib/supabase/config';
import { createClient } from '@/lib/supabase/server';
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== siteOrigin()) return new NextResponse('Invalid origin', { status: 403 });
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return new NextResponse('Sign out failed. Please try again.', { status: 500 });
  return NextResponse.redirect(new URL('/login', siteOrigin()), 303);
}
