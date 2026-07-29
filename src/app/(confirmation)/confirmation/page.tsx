import { getSession, getSubscription } from '@/server/stripe';
import { calculateTier } from '@/server/utils';
import GoogleAnalytics from './GoogleAnalytics';
import Umami from './Umami';
import MetaPixel from './MetaPixel';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const sessionId = (await searchParams).session;
  const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } =
    await searchParams;

  if (sessionId) {
    const session = await getSession({ sessionId });

    if (session && session.status === 'complete') {
      const subscriptionId = session.subscription as string;
      const subscription = await getSubscription({ subscriptionId });

      const amount = subscription?.items.data[0].plan.amount
        ? subscription.items.data[0].plan.amount / 100
        : 0;
      const currency = subscription?.items.data[0].plan.currency.toUpperCase();
      const interval = subscription?.items.data[0].plan.interval as
        | 'month'
        | 'year';
      const tier = `Tier ${calculateTier({ amount, interval })}`;

      // Only register analytics if session is validated
      return (
        <>
          <GoogleAnalytics
            currency={currency}
            subscriptionTier={tier}
            transactionId={sessionId}
            utm={{
              source: utm_source,
              medium: utm_medium,
              campaign: utm_campaign,
              term: utm_term,
              content: utm_content,
            }}
            value={amount}
          />
          <MetaPixel
            currency={currency}
            subscriptionTier={tier}
            transactionId={sessionId}
            utm={{
              source: utm_source,
              medium: utm_medium,
              campaign: utm_campaign,
              term: utm_term,
              content: utm_content,
            }}
            value={amount}
          />
          <Umami
            currency={currency}
            subscriptionTier={tier}
            transactionId={sessionId}
            utm={{
              source: utm_source,
              medium: utm_medium,
              campaign: utm_campaign,
              term: utm_term,
              content: utm_content,
            }}
            value={amount}
          />

          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              maxWidth: '480px',
              margin: '0 auto',
              padding: '2rem',
            }}
          >
            <h1
              style={{
                color: 'var(--blue)',
                fontFamily: 'serif',
                fontStyle: 'italic',
                marginTop: 0,
              }}
            >
              You're in the club!
            </h1>
            <p
              style={{
                marginBottom: 0,
              }}
            >
              Thank you for supporting Streets For All. Check your email for a
              unique login link for the membership portal.
            </p>
          </div>
        </>
      );
    }
  }

  return (
    <div
      style={{
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          color: 'var(--blue)',
          fontFamily: 'serif',
          marginTop: 0,
        }}
      >
        Not found
      </h1>
      <p
        style={{
          marginBottom: 0,
        }}
      >
        Oops, the page you're trying to reach wasn't found.
      </p>
    </div>
  );
}
