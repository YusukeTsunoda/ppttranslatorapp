'use client';

import { Suspense } from 'react';
import { SignIn } from '../signin';

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn mode="signin" />
    </Suspense>
  );
} 