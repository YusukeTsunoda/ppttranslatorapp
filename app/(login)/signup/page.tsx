'use client';

import { Metadata } from 'next';
import { Suspense } from 'react';
import Signin from '../signin';

export const metadata: Metadata = {
  title: 'アカウント作成',
  description: '新規アカウントを作成してください',
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <Suspense>
      <Signin mode="signup" />
    </Suspense>
  );
}
