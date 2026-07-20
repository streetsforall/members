import Script from 'next/script';
import Footer from '../components/footer';
import Header from '../components/header';
import '../global.css';
import { Courier_Prime } from 'next/font/google';

export const metadata = {
  title: 'Streets for All Membership Club',
  keywords: 'Streets for All, Membership, Members Club',
  description:
    'The Streets For All Members Club is an exclusive group for our most loyal supporters. Perks include unique stickers, t-shirts, hats and discounts with partners, having a say in the organization’s endorsements and special members-only events.',
};

const courier = Courier_Prime({
  weight: ['400', '700'],
  style: ['normal'],
  subsets: ['latin'],
});

const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || '';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={courier.className} lang="en">
      <head>
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id={UMAMI_WEBSITE_ID}
          data-auto-track="false"
        />
        <link rel="icon" href="/favicon.png" sizes="any" />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
