import { type NextApiRequest, type NextApiResponse } from 'next';
import pino from 'pino';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { addMember } from '@/server/dbHelpers';
import { getChapterFromZip } from '@/server/zipUtils';

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
      )) as Stripe.CustomerCreatedEvent;
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
      case 'customer.created':
        const customer = event.data.object;

        const zipCode = customer?.address?.postal_code;
        const chapter = getChapterFromZip(zipCode ?? undefined);

        // Add member to DB
        const member = {
          name: customer.name as string,
          phone: customer.phone as string,
          email: customer.email as string,
          address: JSON.stringify(customer.address),
          customerId: customer.id,
          chapter,
        };
        addMember(member, logger);

        return res.status(200).send('Member added');
      default:
        logger.error(`Unhandled event type ${event.type}`);

        return res.status(400).send('Invalid event type');
    }
  }
}
