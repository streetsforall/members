'use client';

import Script from 'next/script';

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
  return (
    <Script>
      {
        /* Register visit and UTM query params */
        `umami.track();`
      }

      {
        /* Register event with UTM properties */
        `umami.track('new-subscription', ${JSON.stringify(utm)});`
      }
    </Script>
  );
}
