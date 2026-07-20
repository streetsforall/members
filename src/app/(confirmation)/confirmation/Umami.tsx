'use client';

import { useEffect } from 'react';

const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || '';

interface UTM {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

interface UmamiProps {
  utm?: UTM;
}

export default function Umami({ utm }: UmamiProps) {
  useEffect(() => {
    if (UMAMI_WEBSITE_ID) {
      // Register visit and UTM query params
      window.umami.track();

      // Register event with UTM properties
      utm
        ? window.umami.track('new-subscription', utm)
        : window.umami.track('new-subscription');
    }
  }, []);

  return <></>;
}
