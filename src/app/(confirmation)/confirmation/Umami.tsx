'use client';

import { useEffect } from 'react';

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
    // Register visit and UTM query params
    window.umami.track();

    // Register event with UTM properties
    utm
      ? window.umami.track('new-subscription', utm)
      : window.umami.track('new-subscription');
  }, []);

  return <></>;
}
