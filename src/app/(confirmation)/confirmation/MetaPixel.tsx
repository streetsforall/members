'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

interface UTM {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

interface MetaPixelProps {
  currency?: string;
  subscriptionTier: string;
  transactionId: string;
  utm?: UTM;
  value?: number;
}

// From https://github.com/vercel/next.js/tree/canary/examples/with-facebook-pixel
export default function MetaPixel({
  currency,
  subscriptionTier,
  transactionId,
  utm,
  value,
}: MetaPixelProps) {
  const [loaded, setLoaded] = useState(false);
  const pathName = usePathname();

  useEffect(() => {
    if (META_PIXEL_ID) {
      if (!loaded) return;

      // @ts-ignore
      window.fbq('track', 'PageView');

      utm
        ? // @ts-ignore
          window.fbq('track', 'Subscribe', {
            currency,
            subscription_tier: subscriptionTier,
            transaction_id: transactionId,
            ...utm,
            value,
          })
        : // @ts-ignore
          window.fbq('track', 'Subscribe', {
            currency,
            subscription_tier: subscriptionTier,
            transaction_id: transactionId,
            value,
          });
    }
  }, [loaded, pathName]);

  if (META_PIXEL_ID) {
    return (
      <Script
        id="meta-pixel"
        src="/scripts/meta-pixel.js"
        strategy="afterInteractive"
        onLoad={() => setLoaded(true)}
        data-pixel-id={META_PIXEL_ID}
      />
    );
  } else {
    return <></>;
  }
}
