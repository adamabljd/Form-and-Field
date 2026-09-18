'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, ChartNoAxesCombined, Dumbbell, LayoutDashboard, Library, LogOut, Settings, Sprout, Volleyball } from 'lucide-react';
const links = [
  { href: '/dashboard', label: 'Dashboard', short: 'Home', icon: LayoutDashboard },
  { href: '/workout', label: "Workout & Programs", short: 'Programs', icon: Dumbbell },
  { href: '/exercises', label: 'Exercise Library', short: 'Library', icon: Library },
  { href: '/settings', label: 'Settings', short: 'Settings', icon: Settings },
];
export function Brand() {
  return <Link href="/" className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white"><ChartNoAxesCombined size={23} strokeWidth={2.5}/></span><span className="text-lg font-extrabold tracking-[-0.8px]">form<span className="px-0.5 font-normal text-muted">&</span>field<span className="text-accent">.</span></span></Link>;
}
export function AppShell({ children, preview = false, email }: { children: React.ReactNode; preview?: boolean; email?: string }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + '/') || (path === '/' && href === '/dashboard');
  return <div className="min-h-screen">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[236px] flex-col border-r border-line bg-white px-5 py-8 lg:flex">
      <div className="px-3"><Brand/><p className="mt-3 pl-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted">Built for the all-round athlete</p></div>
      <p className="eyebrow mb-3 mt-12 px-3">Your training space</p>
      <nav className="space-y-1.5">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3.5 text-[13px] font-medium transition ${active(href) ? 'bg-emerald-800 text-white shadow-sm' : 'text-muted hover:bg-emerald-50 hover:text-ink'}`}><Icon size={18}/>{label}{active(href) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent"/>}</Link>)}</nav>
      <div className="mt-auto"><div className="rounded-xl border border-[#e4e5db] bg-[#f1f2eb] p-4"><Sprout size={22} className="mb-3 text-[#697c4b]"/><p className="text-xs font-semibold">Strength meets the beautiful game.</p><p className="mt-2 text-[11px] leading-relaxed text-muted">Build a body that performs. On the bar. On the pitch.</p><div className="mt-4 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-[#6e7b56]"><span className="h-1.5 w-1.5 rounded-full bg-[#819364]"/>The hybrid approach</div></div>
      <div className="mt-5 border-t border-line pt-5">{preview ? <Link href="/login" className="flex items-center gap-3 px-3 text-xs font-semibold text-muted"><ArrowUpRight size={17}/>Create your account</Link> : <form action="/auth/signout" method="post"><button className="flex w-full items-center gap-3 px-3 text-xs font-medium text-muted"><LogOut size={17}/>Sign Out</button></form>}</div></div>
    </aside>
    <div className="lg:pl-[236px]"><header className="flex h-[77px] items-center justify-between border-b border-line bg-white/90 px-5 sm:px-9"><div className="lg:hidden"><Brand/></div><div className="hidden items-center gap-2 text-xs text-muted lg:flex"><span>My workspace</span><span className="mx-2 text-[#c7c9bf]">/</span><span className="font-medium text-ink">{links.find(l=>active(l.href))?.label ?? 'Dashboard'}</span></div><div className="flex items-center gap-4"><span className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[10px] font-medium sm:flex"><Volleyball size={13} className="text-accent"/>Hybrid athlete</span>{preview ? <Link href="/login" className="flex items-center gap-2 text-xs font-semibold">Get started<ArrowUpRight size={15}/></Link> : <Link href="/settings" aria-label="Account settings" title={email} className="flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-[#e8ebdc] text-xs font-bold uppercase">{email?.slice(0,2) || 'ME'}</Link>}</div></header>
    <main className="mx-auto max-w-[1536px] px-5 pb-28 pt-8 sm:px-9 lg:pb-10">{children}</main>
    <footer className="mx-9 hidden items-center justify-between border-t border-line py-5 text-[10px] text-muted lg:flex"><span>FORM & FIELD © {new Date().getFullYear()}</span><span>A little stronger. A little sharper. Every day.</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#8c9d74]"/>Built for your long game</span></footer></div>
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-white/95 shadow-[0_-4px_24px_rgba(15,50,35,0.06)] backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:hidden">{links.map(({ href, short, icon: Icon }) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} className={`flex flex-1 flex-col items-center gap-1.5 py-4 text-[10px] ${active(href) ? 'bg-emerald-50 text-accent' : 'text-muted hover:bg-canvas'}`}><Icon size={20}/>{short}</Link>)}</nav>
  </div>;
}
