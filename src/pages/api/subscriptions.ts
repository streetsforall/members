import { type NextApiRequest, type NextApiResponse } from 'next';
import pino from 'pino';
import Stripe from 'stripe';
import { buffer } from 'micro';
import {
  addMember,
  cancelMember,
  getMemberByCustomerId,
  setMemberUpdate,
  updateMemberSubscription,
} from '@/server/db';
import { addToMailingList } from '@/server/mailchimp';
import { createOrder } from '@/server/printful';
import { getCustomer } from '@/server/stripe';
import { calculateTier, dollar, getChapterFromZip } from '@/server/utils';

const parentLogger = pino();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const endpointSecret = process.env.STRIPE_SUBSCRIPTIONS_HOOK_SECRET as string;

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

    const subscription = event.data.object;

    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;
    const subscriptionId = subscription.id;

    // Create logger instance for request
    const logger = parentLogger.child({
      request_id: event.request?.id,
      event_id: event.id,
      event_type: event.type,
      customer_id: customerId,
      subscription_id: subscriptionId,
    });

    logger.info({ step: 'incoming_request' }, 'Incoming request');

    // Get customer and subscription details from Stripe
    const customer = (await getCustomer({ customerId })) as Stripe.Customer;

    // Prepare data
    const name = customer.name as string;
    const email = customer.email as string;
    const phone = customer.phone as string;

    // Prefer shipping address, fall back to billing address
    const billingAddress = customer.address;
    const shippingAddress = customer.shipping?.address;
    const address = shippingAddress || billingAddress;

    const address1 = address?.line1 as string;
    const address2 = address?.line2;
    const city = address?.city as string;
    const stateCode = address?.state as string;
    const zip = address?.postal_code as string;
    const countryCode = address?.country as string;

    const chapter = getChapterFromZip(zip);

    const amount = subscription.items.data[0].plan.amount || 0;
    const interval = subscription.items.data[0].plan.interval as
      | 'month'
      | 'year';
    const tier = calculateTier({ amount, interval }, logger);

    // Handle the event
    switch (event.type) {
      /**
       * New subscription
       */
      case 'customer.subscription.created': {
        logger.info(
          {
            step: 'initiate_new_subscription',
            amount: amount / 100,
            interval,
            tier,
          },
          'New subscription received',
        );

        // Add member to DB
        const member = {
          customerId,
          subscriptionId,
          name,
          phone,
          email,
          address: JSON.stringify(address),
          chapter,
          amount: amount / 100,
          tier,
        };
        await addMember(member, logger);

        // Record update in DB
        const update = `*${name}* joined the membership program at *Tier ${tier}*.`;
        const memberUpdate = {
          email,
          newTier: tier,
          update,
        };
        await setMemberUpdate(memberUpdate, logger);

        return res.status(200).send('Subscription created');
      }

      /**
       * Subscription changed or canceled
       */
      case 'customer.subscription.updated': {
        // Update member subscription information in DB
        const data = {
          customerId,
          subscriptionId,
          address: JSON.stringify(address),
          amount: amount / 100,
          tier,
        };
        await updateMemberSubscription(data, logger);

        // Future-dated cancelation
        if (subscription.cancel_at) {
          // Only catch first call to prevent duplicate updates
          if (event.data.previous_attributes?.cancel_at === null) {
            const cancelDate = new Date(subscription.cancel_at * 1000);
            const reason = subscription.cancellation_details?.reason;

            logger.info(
              { step: 'initiate_cancelation', cancelDate, reason },
              'Subscription scheduled to cancel',
            );

            // Record update in DB
            const update = `*${name}* set their *Tier ${tier}* membership to end on \`${cancelDate}\` because \`${reason}\``;
            const memberUpdate = {
              email,
              newTier: tier,
              update,
            };
            await setMemberUpdate(memberUpdate, logger);
          }
        }

        // Consider update only if amount actually changes
        const prevAmount =
          event.data.previous_attributes?.items?.data[0].plan.amount;
        if (prevAmount && amount != prevAmount) {
          const member = await getMemberByCustomerId(customerId);

          const prevTier = member?.tier;
          const shirtSize = member?.shirt_size;

          logger.info(
            {
              step: 'update_subscription',
              prev_amount: prevAmount / 100,
              new_amount: amount / 100,
              prev_tier: prevTier,
              new_tier: tier,
            },
            'Subscription updated',
          );

          // Record update in DB
          const update = `*${name}* changed their membership from \`${dollar.format(prevAmount / 100)}\` to \`${dollar.format(amount / 100)}\`.`;
          const memberUpdate = {
            email,
            newTier: tier,
            update,
          };
          await setMemberUpdate(memberUpdate, logger);

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
              tier,
            },
            logger,
          );

          // Update mailchimp with any new info (i.e. upgraded tier)
          await addToMailingList(
            {
              email,
              firstName: name.split(' ')[0],
              lastName: name.split(' ')[1],
              address1,
              address2: address2 ?? undefined,
              city,
              zip,
              countryCode,
              phone,
              tier,
            },
            logger,
          );
        }

        return res.status(200).send('Subscription updated');
      }

      /**
       * Subscription ended
       * Fires not when the member performs a cancel action but when the last billing cycle is complete
       * i.e. a canceled member can still access their page until a month after canceling
       */
      case 'customer.subscription.deleted': {
        logger.info(
          { step: 'end_subscription', amount: amount / 100 },
          'Subscription ended',
        );

        // Update member in DB
        const data = {
          tier: 0,
          email,
          status: 'canceled',
          amount: 0,
        };
        await cancelMember(data, logger);

        // Record update in DB
        const update = `*${name}'s* \`${dollar.format(amount / 100)}\` plan has ended.`;
        const memberUpdate = {
          email,
          newTier: 0,
          update,
        };
        await setMemberUpdate(memberUpdate, logger);

        return res.status(200).send('Subscription ended');
      }
      default:
        logger.error('Unhandled event type');

        return res.status(400).send('Invalid event type');
    }
  }
}
