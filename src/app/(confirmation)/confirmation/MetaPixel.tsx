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
  utm?: UTM;
}

// From https://github.com/vercel/next.js/tree/canary/examples/with-facebook-pixel
export default function MetaPixel({ utm }: MetaPixelProps) {
  const [loaded, setLoaded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (META_PIXEL_ID) {
      if (!loaded) return;

      window.fbq('track', 'PageView');

      utm
        ? window.fbq('track', 'Subscribe', utm)
        : window.fbq('track', 'Subscribe');
    }
  }, [pathname, loaded]);

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
