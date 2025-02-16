import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { UserProvider } from '@/lib/auth';
import { getUser } from '@/lib/db/queries';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialUser = null;
  try {
    initialUser = await getUser();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    // エラーが発生しても、アプリケーションは続行
  }

  return (
    <html lang="ja" className={inter.className}>
      <body>
        <UserProvider initialUser={initialUser}>
          <div className="min-h-screen">
            <main className="flex-1">
              {children}
            </main>
            <Toaster />
          </div>
        </UserProvider>
      </body>
    </html>
  );
}

export const metadata: Metadata = {
  title: 'PPT翻訳アプリ',
  description: 'PowerPointファイルを簡単に翻訳',
};

export const viewport: Viewport = {
  maximumScale: 1,
};
