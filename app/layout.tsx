// "use client";

import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'PPT Translator',
  description: 'Translate your PowerPoint presentations with AI',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
