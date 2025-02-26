'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession } from './stripe';
import { withTeam } from '@/lib/auth/middleware';

export const checkoutAction = withTeam(async (formData, user) => {
  const priceId = formData.get('priceId') as string;
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  await createCheckoutSession({
    userId: user.id,
    priceId,
    email: user.email || '',
    successUrl: `${baseUrl}/dashboard?success=true`,
    cancelUrl: `${baseUrl}/pricing?canceled=true`
  });
});

export const customerPortalAction = withTeam(async (_, user) => {
  const portalSession = await createCustomerPortalSession(user);
  redirect(portalSession.url);
});
