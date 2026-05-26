import { type NextApiRequest, type NextApiResponse } from 'next';
import pino from 'pino';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { setMemberShirt, setMemberUpdate } from '@/server/dbHelpers';
import { validateTier } from './stripe_members';
import { getCustomer, getSubscription } from '@/server/stripe';
import { sendWelcomeEmail } from '@/server/email';
import { createOrder, ShirtSize } from '@/server/printful';
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

    // Make sure checkout is a subscription
    if (
      session.mode !== 'subscription' ||
      !session.subscription ||
      !session.customer
    ) {
      return res.status(200).send('Not a member subscription');
    }

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;

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
        // Get customer and subscription details from Stripe
        const customer = (await getCustomer(customerId)) as Stripe.Customer;
        const subscription = await getSubscription(subscriptionId, logger);

        // Prepare data
        const name = customer.name as string;
        const email = customer.email as string;
        const phone = customer.phone as string;
        const address1 = customer.shipping?.address?.line1 as string;
        const address2 = customer.shipping?.address?.line2;
        const city = customer.shipping?.address?.city as string;
        const stateCode = customer.shipping?.address?.state as string;
        const zip = customer.shipping?.address?.postal_code as string;
        const countryCode = customer.shipping?.address?.country as string;

        const amount = subscription?.items.data[0].plan.amount || 0;
        const interval = subscription?.items.data[0].plan.interval as
          | 'month'
          | 'year';
        const tier = validateTier(amount, interval, logger);

        const shirtSize = (session?.custom_fields?.[0]?.dropdown?.value ||
          'l') as ShirtSize;

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
        await createOrder(
          {
            shirtSize,
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
