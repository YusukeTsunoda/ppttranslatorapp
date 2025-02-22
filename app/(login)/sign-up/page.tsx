'use client';

import { Metadata } from 'next';
import { Suspense } from 'react';
import { Login } from '../login';

export const metadata: Metadata = {
  title: 'アカウント作成',
  description: '新規アカウントを作成してください',
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <Suspense>
      <Login mode="signup" />
    </Suspense>
  );
}
