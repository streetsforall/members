import { getSubscriptionLog, setSubscriptionLog } from '@/server/db';
import {
  getSession,
  getSubscription,
  updateSubscription,
} from '@/server/stripe';
import { calculateTier } from '@/server/utils';
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

    // Only register analytics if session is validated
    if (session && session.status === 'complete') {
      const subscriptionId = session.subscription as string;
      const subscription = await getSubscription({ subscriptionId });

      const amount = subscription?.items.data[0].plan.amount || 0;
      const currency = subscription?.items.data[0].plan.currency.toUpperCase();
      const interval = subscription?.items.data[0].plan.interval as
        | 'month'
        | 'year';
      const tier = `Tier ${calculateTier({ amount, interval })}`;

      // Add metadata to subscription in Stripe if not already logged (eliminates effect of page refreshes)
      const subscriptionLog = await getSubscriptionLog(subscriptionId);

      if (!subscriptionLog) {
        await updateSubscription(subscriptionId, {
          metadata: {
            utm_source: utm_source || null,
            utm_medium: utm_medium || null,
            utm_campaign: utm_campaign || null,
            utm_term: utm_term || null,
            utm_content: utm_content || null,
          },
        });

        await setSubscriptionLog(subscriptionId);
      }

      return (
        <>
          {
            /* Only register analytics if subscription not already logged */
            !subscriptionLog && (
              <>
                <MetaPixel
                  currency={currency}
                  subscriptionId={subscriptionId}
                  subscriptionTier={tier}
                  transactionId={sessionId}
                  utm={{
                    source: utm_source,
                    medium: utm_medium,
                    campaign: utm_campaign,
                    term: utm_term,
                    content: utm_content,
                  }}
                  value={amount / 100}
                />
                <Umami
                  currency={currency}
                  subscriptionId={subscriptionId}
                  subscriptionTier={tier}
                  transactionId={sessionId}
                  utm={{
                    source: utm_source,
                    medium: utm_medium,
                    campaign: utm_campaign,
                    term: utm_term,
                    content: utm_content,
                  }}
                  revenue={amount / 100}
                />
              </>
            )
          }

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
