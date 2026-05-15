import { type NextApiRequest, type NextApiResponse } from 'next';
import pino from 'pino';
import Stripe from 'stripe';
import { buffer } from 'micro';
import {
  cancelMember,
  getMemberByCustomerId,
  setMemberUpdate,
  updateMemberSubscription,
} from '@/server/dbHelpers';
import { dollar, retrieveCustomer, validateTier } from './stripe_members';
import { new_order } from '@/server/merch_order';
import addMailchimp from '@/server/mailchimp';

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

    const subscription = event.data.object;

    const customerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;
    const member = await getMemberByCustomerId(customerId);
    const amount = subscription.items.data[0].plan.amount || 0;
    const interval = subscription.items.data[0].plan.interval as
      | 'month'
      | 'year';

    // Handle the event
    switch (event.type) {
      /**
       * New subscription
       */
      case 'customer.subscription.created': {
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
        const update = `${member.name} joined the membership program at tier ${tier}`;
        const memberUpdate = {
          email: member.email,
          newTier: tier,
          update,
        };
        setMemberUpdate(memberUpdate, logger);

        // TODO: Create merch order if applicable

        return res.status(200).send('Subscription created');
      }

      /**
       * Subscription changed or canceled
       */
      case 'customer.subscription.updated': {
        const tier = validateTier(amount, interval, logger);

        // Future-dated cancelation
        if (subscription.cancel_at) {
          const cancelDate = new Date(subscription.cancel_at * 1000);
          const reason = subscription.cancellation_details?.reason;

          logger.info(
            { step: 'initiate_cancelation', cancelDate, reason },
            'Subscription scheduled to cancel',
          );

          // Update member subscription information in DB
          const data = {
            customerId,
            subscriptionId: subscription.id,
            amount: amount / 100,
            tier,
          };
          updateMemberSubscription(data, logger);

          // Record update in DB
          const update = `${member.name} set their membership to end on ${cancelDate} because ${reason}`;
          const memberUpdate = {
            email: member.email,
            newTier: tier,
            update,
          };
          setMemberUpdate(memberUpdate, logger);
        }

        // Consider update only if amount actually changes
        const prevAmount =
          event.data.previous_attributes?.items?.data[0].plan.amount;
        if (prevAmount && amount != prevAmount) {
          const prevTier = member.tier;
          const size = member.shirt_size;

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

          // Update member subscription information in DB
          const data = {
            customerId,
            subscriptionId: subscription.id,
            amount: amount / 100,
            tier,
          };
          updateMemberSubscription(data, logger);

          // Record update in DB
          const update = `${member.name} changed their membership from ${dollar.format(prevAmount / 100)} to ${dollar.format(amount / 100)}`;
          const memberUpdate = {
            email: member.email,
            newTier: tier,
            update,
          };
          setMemberUpdate(memberUpdate, logger);

          // Retrieve from Stripe
          const customer: any = await retrieveCustomer(customerId);
          logger.debug(customer, 'Retrieved customer');

          // Create merch order
          const order = await new_order(
            {
              size,
              name: customer.name,
              address1: customer.address.line1,
              address2: customer.address.line2,
              city: customer.address.city,
              state_name: customer.address.state,
              country_name: customer.address.country,
              zip: customer.address.postal_code,
              phone: customer.phone,
              email: customer.email,
            },
            tier,
            logger,
          );
          logger.debug(order, 'Placed merch order');

          // Update mailchimp with any new info (i.e. upgraded tier)
          try {
            addMailchimp(
              customer.email,
              {
                FNAME: customer.name.split(' ')[0] || '',
                LNAME: customer.name.split(' ')[1] || '',
                ADD_ST: customer.address1 || '',
                ADD_ST_2: customer.address2 || '',
                ADD_CITY: customer.city || '',
                ADD_ZIP: customer.zip || '',
                ADD_COUNTR: customer.country || '',
                PHONE: customer.phone || '',
                MEMBERSHIP: tier,
              },
              logger,
            );
          } catch (error) {
            logger.error(error, 'Error with Mailchimp update');
          }
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

        // Retrieve from Stripe
        const customer: any = await retrieveCustomer(customerId);
        logger.debug(customer, 'Retrieved customer');

        // Update member in DB
        const data = {
          tier: 0,
          email: member.email,
          status: customer.status ? customer.status : 'canceled',
          amount: 0,
        };
        cancelMember(data, logger);

        // Record update in DB
        const update = `${member.name}'s ${dollar.format(amount / 100)} plan has ended`;
        const memberUpdate = {
          email: member.email,
          newTier: 0,
          update,
        };
        setMemberUpdate(memberUpdate, logger);

        return res.status(200).send('Subscription ended');
      }
      default:
        logger.error('Unhandled event type');

        return res.status(400).send('Invalid event type');
    }
  }
}
