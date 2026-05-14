import { type NextApiRequest, type NextApiResponse } from 'next';
import pino from 'pino';
import Stripe from 'stripe';
import { buffer } from 'micro';
import {
  getMemberByCustomerId,
  setMemberUpdate,
  updateMemberSubscription,
} from '@/server/dbHelpers';
import { validateTier } from './stripe_members';

const parentLogger = pino();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const endpointSecret = process.env.STRIPE_HOOK_SECRET as string;

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Main request handler
 * @param req - Request object
 * @param res - Response object
 * @returns
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).send('Method not allowed');
  } else {
    // Workaround because Stripe validation requires raw body which Next.js automatically parses
    const rawBody = await buffer(req);

    // Get the signature sent by Stripe
    const signature = req.headers['stripe-signature'] as string;

    let event;
    // Validate webhook request
    try {
      event = (await stripe.webhooks.constructEvent(
        rawBody,
        signature,
        endpointSecret,
      )) as
        | Stripe.CustomerSubscriptionCreatedEvent
        | Stripe.CustomerSubscriptionDeletedEvent
        | Stripe.CustomerSubscriptionUpdatedEvent;
    } catch (err) {
      parentLogger.error(
        { error: err.message },
        'Webhook signature verification failed',
      );

      return res.status(400).send('Webhook signature verification failed');
    }

    // Create logger instance for request
    const logger = parentLogger.child({
      request_id: event.request?.id,
      event_id: event.id,
      event_type: event.type,
      customer_id: event.data.object.id,
    });

    logger.info({ step: 'incoming_request' }, 'Incoming request');

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
        const subscription = event.data.object;

        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id;
        const amount = subscription.items.data[0].plan.amount || 0;
        const interval = subscription.items.data[0].plan.interval as
          | 'month'
          | 'year';
        const tier = validateTier(amount, interval, logger);

        logger.info(
          {
            step: 'initiate_new_subscription',
            amount: amount / 100,
            interval,
            tier,
          },
          'New subscription received',
        );

        // Add member subscription information to DB
        const data = {
          customerId,
          subscriptionId: subscription.id,
          amount: amount / 100,
          tier,
        };
        updateMemberSubscription(data, logger);

        // Record update in DB
        const member = await getMemberByCustomerId(customerId);
        const update = `${member.name} joined the membership program at tier ${tier}`;
        const memberUpdate = {
          email: member.email,
          newTier: tier,
          update: update,
        };
        setMemberUpdate(memberUpdate, logger);

        return res.status(200).send('Subscription created');
      default:
        logger.error(`Unhandled event type ${event.type}`);

        return res.status(400).send('Invalid event type');
    }
  }
}
