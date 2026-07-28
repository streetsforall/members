'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || '';

interface UTM {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

interface UmamiProps {
  currency?: string;
  subscriptionTier: string;
  transactionId: string;
  utm?: UTM;
  value?: number;
}

export default function Umami({
  currency,
  subscriptionTier,
  transactionId,
  utm,
  value,
}: UmamiProps) {
  const [loaded, setLoaded] = useState(false);
  const pathName = usePathname();

  useEffect(() => {
    if (UMAMI_WEBSITE_ID) {
      if (!loaded) return;

      // Register visit and UTM query params
      // @ts-ignore
      umami.track();

      // Register event with UTM properties
      utm
        ? // @ts-ignore
          umami.track('new-subscription', {
            currency,
            subscription_tier: subscriptionTier,
            transaction_id: transactionId,
            ...utm,
            value,
          })
        : // @ts-ignore
          umami.track('new-subscription', {
            currency,
            subscription_tier: subscriptionTier,
            transaction_id: transactionId,
            value,
          });
    }
  }, [loaded, pathName]);

  return (
    <Script
      src="https://cloud.umami.is/script.js"
      data-website-id={UMAMI_WEBSITE_ID}
      data-auto-track="false"
      onLoad={() => setLoaded(true)}
    />
  );
}
