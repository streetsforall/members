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
  utm?: UTM;
}

export default function GoogleAnalytics({ utm }: GoogleAnalyticsProps) {
  useEffect(() => {
    if (GA_MEASUREMENT_ID) {
      utm
        ? sendGAEvent('event', 'new_subscription', utm)
        : sendGAEvent('event', 'new_subscription');
    }
  }, []);

  if (GA_MEASUREMENT_ID) {
    return <GA gaId={GA_MEASUREMENT_ID} />;
  } else {
    return <></>;
  }
}
