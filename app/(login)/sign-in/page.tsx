import { Metadata } from 'next';
import { Suspense } from 'react';
import { Login } from '../login';

export const metadata: Metadata = {
  title: 'サインイン',
  description: 'アカウントにサインインしてください',
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Login mode="signin" />
    </Suspense>
  );
}
