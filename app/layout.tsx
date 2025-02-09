import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { UserProvider } from '@/lib/auth';
import { getUser } from '@/lib/db/queries';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'PPT翻訳アプリ',
  description: 'PowerPointファイルを簡単に翻訳',
};

export const viewport: Viewport = {
  maximumScale: 1,
};

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userPromise = getUser();

  return (
    <html
      lang="ja"
      className={inter.className}
    >
      <body className="min-h-[100dvh] bg-gray-50">
        <UserProvider userPromise={userPromise}>
          {children}
          <Toaster />
        </UserProvider>
      </body>
    </html>
  );
}
