import { type NextApiRequest, type NextApiResponse } from 'next';
import pino from 'pino';
import Stripe from 'stripe';
import { buffer } from 'micro';
import {
  setMemberShirt,
  setMemberUpdate,
} from '@/server/dbHelpers';
import { validateTier } from './stripe_members';
import { getSubscription } from '@/server/stripe';
import { sendWelcomeEmail } from '@/server/email';
import { createOrder, Size } from '@/server/printful';
import { addToMailingList } from '@/server/mailchimp';

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
      )) as Stripe.CheckoutSessionCompletedEvent;
    } catch (err) {
      parentLogger.error(
        { error: err.message },
        'Webhook signature verification failed',
      );

      return res.status(400).send('Webhook signature verification failed');
    }

    const session = event.data.object;

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    // Create logger instance for request
    const logger = parentLogger.child({
      request_id: event.request?.id,
      event_id: event.id,
      event_type: event.type,
      customer_id: customerId,
      subscription_id: subscriptionId,
    });

    logger.info({ step: 'incoming_request' }, 'Incoming request');

    // Handle the event
    switch (event.type) {
      /**
       * Completed checkout
       * Fires at the end of someone signing up and after the new subscriber is logged
       * This is when the shirt size is set for new members (weirdly the only Stipe API call that forwards custom fields).
       */
      case 'checkout.session.completed': {
        // Make sure checkout is a subscription
        if (session.mode !== 'subscription' || !session.subscription) {
          return res.status(200).send('Not a member subscription');
        }

        // Get subscription details from Stripe
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;
        const subscription = await getSubscription(subscriptionId, logger);

        const amount = subscription?.items.data[0].plan.amount || 0;
        const interval = subscription?.items.data[0].plan.interval as
          | 'month'
          | 'year';

        const tier = validateTier(amount, interval, logger);

        logger.info(
          {
            step: 'complete_checkout',
            amount: amount / 100,
            tier,
          },
          'Checkout completed',
        );

        // Send welcome email
        await sendWelcomeEmail(
          {
            email: session.customer_details?.email as string,
            name: session.customer_details?.name as string,
            tier,
          },
          logger,
        );

        // Create merch order
        const name = session.customer_details?.name as string;
        const email = session.customer_details?.phone as string;
        const phone = session.customer_details?.email as string;
        const shirtSize = (session?.custom_fields?.[0]?.dropdown?.value ||
          'l') as Size;
        const address1 = session.collected_information?.shipping_details
          ?.address.line1 as string;
        const address2 =
          session.collected_information?.shipping_details?.address.line2 || '';
        const city = session.collected_information?.shipping_details?.address
          .city as string;
        const stateCode = session.collected_information?.shipping_details
          ?.address.state as string;
        const countryCode = session.collected_information?.shipping_details
          ?.address.country as string;
        const zip = session.collected_information?.shipping_details?.address
          .postal_code as string;

        await createOrder(
          {
            size: shirtSize,
            name,
            address1,
            address2,
            city,
            stateCode,
            countryCode,
            zip,
            phone,
            email,
          },
          tier,
          logger,
        );

        // Record update in DB
        const update = `Merch ordered for ${session.customer_details?.name}`;
        const memberUpdate = {
          email: session.customer_details?.email as string,
          newTier: tier,
          update,
        };
        setMemberUpdate(memberUpdate, logger);

        // Update member's shirt size in DB
        const memberShirtAdd = {
          email: session.customer_details?.email as string,
          size: shirtSize,
        };
        setMemberShirt(memberShirtAdd, logger);

        addToMailingList(
          email,
          {
            FNAME: name.split(' ')[0],
            LNAME: name.split(' ')[1],
            ADD_ST: address1,
            ADD_ST_2: address2,
            ADD_CITY: city,
            ADD_ZIP: zip,
            ADD_COUNTR: countryCode,
            PHONE: phone,
            MEMBERSHIP: tier,
          },
          logger,
        );

        return res.status(200).send('Checkout completed');
      }

      default:
        logger.error('Unhandled event type');

        return res.status(400).send('Invalid event type');
    }
  }
}
