import { Button } from '@/components/ui/button';
import { ArrowRight, Globe, BookOpen, Settings, Clock, CreditCard } from 'lucide-react';

export default function DashboardPage() {
  return (
    <main className="bg-white">
      {/* ヒーローセクション */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              ダッシュボード
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              ようこそ、PPT翻訳アプリへ
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
