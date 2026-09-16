import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Form & Field — Train for both.', description: 'Your home for calisthenics, football, and a stronger all-round game.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased">{children}</body></html>;
}
