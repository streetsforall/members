'use client';

import { GoogleAnalytics as GA, sendGAEvent } from '@next/third-parties/google';
import { useEffect } from 'react';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

interface UTM {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

interface GoogleAnalyticsProps {
  currency?: string;
  subscriptionTier: string;
  transactionId: string;
  utm?: UTM;
  value?: number;
}

export default function GoogleAnalytics({
  currency,
  subscriptionTier,
  transactionId,
  utm,
  value,
}: GoogleAnalyticsProps) {
  useEffect(() => {
    if (GA_MEASUREMENT_ID) {
      utm
        ? sendGAEvent('event', 'new_subscription', {
            currency,
            subscription_tier: subscriptionTier,
            transaction_id: transactionId,
            ...utm,
            value,
          })
        : sendGAEvent('event', 'new_subscription', {
            currency,
            subscription_tier: subscriptionTier,
            transaction_id: transactionId,
            value,
          });
    }
  }, []);

  if (GA_MEASUREMENT_ID) {
    return <GA gaId={GA_MEASUREMENT_ID} />;
  } else {
    return <></>;
  }
}
