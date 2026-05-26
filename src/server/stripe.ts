import pino, { type Logger } from 'pino';
import Stripe from 'stripe';

// Used for any loggers not passed as arguments
const defaultLogger = pino();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});

/**
 * Retrieve subscription from Stripe
 * @param subscriptionId - Stripe subscription id
 * @param logger - Instance used for logging
 * @returns Stripe subscription record
 */
async function getSubscription(
  subscriptionId: string,
  logger: Logger = defaultLogger,
) {
  const childLogger = logger.child({ step: 'get_stripe_subscription' });

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    childLogger.debug(subscription, 'Retreived subscription');

    return subscription;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

export { getSubscription };
