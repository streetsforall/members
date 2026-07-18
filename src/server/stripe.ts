import pino, { type Logger } from 'pino';
import Stripe from 'stripe';

// Used for any loggers not passed as arguments
const defaultLogger = pino();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});

/**
 * Retrieve customer from Stripe
 * (Stripe does not always include customer information in event data, so must retrieve seperately)
 * @param data.customerId - Stripe customer id
 * @param logger - Instance used for logging
 * @returns Stripe customer record
 */
async function getCustomer(
  data: { customerId: string },
  logger: Logger = defaultLogger,
) {
  const childLogger = logger.child({ step: 'get_stripe_customer' });

  const { customerId } = data;

  try {
    childLogger.debug('Retriving customer from Stripe');

    const customer = await stripe.customers.retrieve(customerId);
    childLogger.debug(customer, 'Retrieved customer');

    return customer;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Retrieve session from Stripe
 * @param data.sessionId - Stripe session id
 * @param logger - Instance used for logging
 * @returns Stripe session record
 */
async function getSession(
  data: { sessionId: string },
  logger: Logger = defaultLogger,
) {
  const childLogger = logger.child({ step: 'get_stripe_session' });

  const { sessionId } = data;

  try {
    childLogger.debug('Retriving session from Stripe');

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    childLogger.debug(session, 'Retrieved session');

    return session;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Retrieve subscription from Stripe
 * @param data.subscriptionId - Stripe subscription id
 * @param logger - Instance used for logging
 * @returns Stripe subscription record
 */
async function getSubscription(
  data: { subscriptionId: string },
  logger: Logger = defaultLogger,
) {
  const childLogger = logger.child({ step: 'get_stripe_subscription' });

  const { subscriptionId } = data;

  try {
    childLogger.debug('Retriving subscription from Stripe');

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    childLogger.debug(subscription, 'Retrieved subscription');

    return subscription;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

export { getCustomer, getSession, getSubscription };
