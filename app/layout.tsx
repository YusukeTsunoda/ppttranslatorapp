// "use client";

import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { ClientProviders } from '@/components/ClientProviders';
import { ReactNode } from 'react';
import Link from 'next/link';
import { Globe } from 'lucide-react';
import { NavBarWrapper } from '@/components/NavBarWrapper';
import { Button } from '@/components/ui/button';
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: 'PPT Translator',
  description: 'Translate your PowerPoint presentations with AI',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Providers>
            <header className="border-b sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50">
              <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl group">
                  <Globe className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
                  <span>PPT Translator</span>
                </Link>
                <nav className="flex items-center gap-4 sm:gap-6">
                  <NavBarWrapper />
                </nav>
              </div>
            </header>
            <ClientProviders>
            {children}
            </ClientProviders>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
