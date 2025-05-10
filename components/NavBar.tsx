"use client";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function NavBar() {
  return (
    <nav className="flex items-center gap-4 sm:gap-6">
      <Link href="/" className="text-sm font-medium nav-link">ホーム</Link>
      <Link href="/translate" className="text-sm font-medium nav-link">翻訳</Link>
      <Link href="/profile" className="text-sm font-medium nav-link">プロフィール</Link>
      <ThemeToggle />
    </nav>
  );
} 