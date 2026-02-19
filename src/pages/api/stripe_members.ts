import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import pino, { type Logger } from 'pino';
import * as dbHelp from '@/server/dbHelpers';
import { new_signup_email } from '@/server/email_token';
import addMailchimp from '@/server/mailchimp';
import { new_order } from '@/server/merch_order';
import { getChapterFromZip } from '@/server/zipUtils';

const parentLogger = pino();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Translate subscription terms to membership tier
 * @param payment - Subscription amount in cents
 * @param interval - Length of the recurring subscription term
 * @param logger - Instance used for logging
 * @returns Tier level
 */
function validateTier(
  payment: number,
  interval: 'month' | 'year',
  logger: Logger,
): number {
  let tier = 0;

  // validate payment
  if (interval == 'month') {
    if (payment >= 4800) {
      tier = 3;
    } else if (payment >= 2400) {
      tier = 2;
    } else if (payment >= 1200) {
      tier = 1;
    }
  } else if (interval == 'year') {
    if (payment >= 55000) {
      tier = 3;
    } else if (payment >= 27000) {
      tier = 2;
    } else if (payment >= 14000) {
      tier = 1;
    }
  }

  logger.debug(
    { step: 'determine_tier', payment, interval, tier },
    `Determined Tier ${tier} based on amount and term`,
  );

  return tier;
}

/**
 * Retrieve member from database
 * @param email - Registered member email
 * @returns Member record
 */
async function getMember(email: string) {
  const member = await dbHelp.retrieveMemberByEmail(email);

  return member;
}

/**
 * Retrieve customer from Stripe
 * (Stripe does not include customer information in event data, so must retrieve seperately)
 * @param customerID - Customer ID in Stripe
 * @returns Stripe customer record
 */
async function retrieveCustomer(customerID: string) {
  const customer = await stripe.customers.retrieve(customerID);

  return customer;
}

const dollar = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

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
  if (req.method === 'POST') {
    // Workaround because Stripe validation requires raw body which Next.js automatically parses
    const buf = await buffer(req);

    const sig = req.headers['stripe-signature'] as string;
    const STRIPE_HOOK = process.env.STRIPE_HOOK_SECRET as string;

    let api_event;
    try {
      // Validate webhook came frome Stripe
      api_event = (await stripe.webhooks.constructEvent(
        buf,
        sig,
        STRIPE_HOOK,
      )) as
        | Stripe.CheckoutSessionCompletedEvent
        | Stripe.CustomerSubscriptionCreatedEvent
        | Stripe.CustomerSubscriptionDeletedEvent
        | Stripe.CustomerSubscriptionUpdatedEvent;
    } catch (err: any) {
      // On error log and return the error message
      parentLogger.error(`❌ Error message: ${err.message}`);

      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Create logger instance for request
    const logger = parentLogger.child({
      request_id: api_event.request?.id,
      event_id: api_event.id,
      event_type: api_event.type,
      customer_id: api_event.data.object.customer,
    });

    logger.info({ step: 'incoming_request' }, 'Incoming request');

    // Iterate through various Stripe webhook event types
    switch (api_event.type) {
      /**
       * New member or updated subscription
       */
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscriber: any = api_event.data.object;

        const customerID = subscriber.customer as string;
        const isNewMember =
          api_event.type == 'customer.subscription.created' ? true : false;
        const amount = subscriber.plan.amount;
        const interval = subscriber.plan.interval;
        const memberTier = validateTier(amount, interval, logger);
        const prevAmount =
          api_event?.data?.previous_attributes?.items?.data[0]?.plan?.amount;

        // Retrieve from Stripe
        const customer: any = await retrieveCustomer(customerID);
        logger.debug(customer, 'Retrieved customer');

        // Get addresses
        const billingAddress = customer.address;
        const shippingAddress = customer.shipping
          ? customer.shipping.address
          : 'no address';

        // Determine chapter based on ZIP code; try shipping address, fall back to billing address
        const zipCode =
          shippingAddress.postal_code ||
          billingAddress.postal_code ||
          undefined;
        const chapter = getChapterFromZip(zipCode);

        // Update member in DB
        const memberObj = {
          tier: memberTier,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          status: customer.status,
          shipping_address: JSON.stringify(shippingAddress),
          amount: amount / 100,
          customer_id: customerID,
          newMember: isNewMember,
          subID: subscriber.id,
          branch: chapter,
        };
        dbHelp.setMember(memberObj, logger);

        // TODO: Log when a subscription renews

        // New member
        if (api_event.type == 'customer.subscription.created') {
          logger.info(
            {
              step: 'initiate_new_subscription',
              amount: amount * 0.01,
              interval,
              tier: memberTier,
            },
            'New subscription received',
          );

          // Record update in DB
          const update =
            customer.name +
            ' joined the membership program at tier ' +
            memberTier;
          const memberUpdate = {
            email: customer.email,
            newTier: memberTier,
            update: update,
          };
          dbHelp.setMemberUpdate(memberUpdate, logger);

          return res.status(200).send('Subscription created');
        }

        // Used to order new merch if someone upgrades
        if (api_event.type == 'customer.subscription.updated') {
          // Future-dated cancelation
          if (subscriber.canceled_at) {
            const cancel_date = new Date(subscriber.cancel_at * 1000);
            const reason = subscriber.cancellation_details.reason;

            logger.info(
              { step: 'initiate_cancelation', cancel_date, reason },
              'Subscription scheduled to cancel',
            );

            // Record update in DB
            const cancel_text =
              customer.name +
              ' set their membership to end on ' +
              cancel_date +
              ' because ' +
              reason;
            const memberUpdate = {
              email: customer.email,
              newTier: memberTier,
              update: cancel_text,
            };
            dbHelp.setMemberUpdate(memberUpdate, logger);
          }

          // Consider update only if amount actually changes
          if (prevAmount && amount != prevAmount) {
            const member = await getMember(customer.email);
            const prevTier = member.tier;
            const size = member.shirt_size;
            logger.debug({ size }, 'Retrieved shirt size');

            logger.info(
              {
                step: 'update_subscription',
                prev_amount: prevAmount * 0.01,
                new_amount: amount * 0.01,
                prev_tier: prevTier,
                new_tier: memberTier,
              },
              'Subscription updated',
            );

            // Record update in DB
            const update =
              customer.name +
              ' changed their membership from ' +
              dollar.format(prevAmount * 0.01) +
              ' to ' +
              dollar.format(amount * 0.01);
            const memberUpdate = {
              email: customer.email,
              newTier: memberTier,
              update: update,
            };
            dbHelp.setMemberUpdate(memberUpdate, logger);

            // Create merch order
            const order = await new_order(
              {
                size: size,
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
              memberTier,
              logger,
            );
            logger.debug(order, 'Placed merch order');

            // Update mailchimp with any new info (i.e. upgraded tier)
            try {
              addMailchimp(customer.email, {
                FNAME: customer.name.split(' ')[0] || '',
                LNAME: customer.name.split(' ')[1] || '',
                ADD_ST: customer.address1 || '',
                ADD_ST_2: customer.address2 || '',
                ADD_CITY: customer.city || '',
                ADD_ZIP: customer.zip || '',
                ADD_COUNTR: customer.country || '',
                PHONE: customer.phone || '',
                MEMBERSHIP: memberTier || '',
              });
            } catch (error) {
              logger.error(error, 'Error with Mailchimp update');
            }
          }

          return res.status(200).send('Subscription updated');
        }

        break;
      }

      /**
       * Completed checkout
       * Fires at the end of someone signing up and after the new subscriber is logged
       * This is when the shirt size is set for new members (weirdly the only Stipe API call that forwards custom fields).
       */
      case 'checkout.session.completed': {
        const checkout: any = api_event.data.object;

        // Make sure checkout is a subscription
        if (checkout.mode != 'subscription') {
          return res.status(200).send('Not a member subscription');
        }

        const member = await getMember(checkout.customer_details.email);
        logger.debug(member, 'Retrived member');

        const mem_tier = member.tier;

        logger.info(
          {
            step: 'complete_checkout',
            amount: checkout.amount_total * 0.01,
            tier: mem_tier,
          },
          'Checkout completed',
        );

        const new_email = await new_signup_email(
          checkout.customer_details.email,
        );
        logger.debug(new_email, 'Sent email');

        // Create merch order
        const shirt_size = checkout?.custom_fields?.[0]?.dropdown?.value || 'L';
        const order = await new_order(
          {
            size: shirt_size,
            name: checkout.customer_details.name,
            address1: checkout.shipping_details.address.line1,
            address2: checkout.shipping_details.address.line2,
            city: checkout.shipping_details.address.city,
            state_name: checkout.shipping_details.address.state,
            country_name: checkout.shipping_details.address.country,
            zip: checkout.shipping_details.address.postal_code,
            phone: checkout.customer_details.phone,
            email: checkout.customer_details.email,
          },
          mem_tier,
          logger,
        );
        logger.debug(order, 'Placed merch order');

        // Record update in DB
        const updateLog = 'Merch ordered for ' + checkout.customer_details.name;
        const memberUpdater = {
          email: checkout.customer_details.email,
          newTier: mem_tier,
          update: updateLog,
        };
        dbHelp.setMemberUpdate(memberUpdater, logger);

        // Update member's shirt size in DB
        const memberShirtAdd = {
          email: checkout.customer_details.email,
          size: shirt_size,
        };
        dbHelp.setMemberShirt(memberShirtAdd, logger);

        try {
          addMailchimp(checkout.customer_details.email, {
            FNAME: checkout.customer_details.name.split(' ')[0],
            LNAME: checkout.customer_details.name.split(' ')[1],
            ADD_ST: checkout.shipping_details.address.line1
              ? checkout.shipping_details.address.line1
              : ' ',
            ADD_ST_2: checkout.shipping_details.address.line2
              ? checkout.shipping_details.address.line2
              : ' ',
            ADD_CITY: checkout.shipping_details.address.city
              ? checkout.shipping_details.address.city
              : ' ',
            ADD_ZIP: checkout.shipping_details.address.postal_code
              ? checkout.shipping_details.address.postal_code
              : ' ',
            ADD_COUNTR: checkout.shipping_details.address.country
              ? checkout.shipping_details.address.country
              : ' ',

            PHONE: checkout.customer_details.phone,
            MEMBERSHIP: mem_tier,
          });
        } catch (error) {
          logger.error(error, 'error with mailchimp');
        }

        return res.status(200).send('Checkout completed');
      }

      /**
       * Subscription ended
       * Fires not when the member performs a cancel action but when the last billing cycle is complete
       * i.e. a canceled member can still access their page until a month after canceling
       */
      case 'customer.subscription.deleted': {
        const canceled_subscriber = api_event.data.object;

        const customerID = canceled_subscriber.customer as string;
        const canceled_amount =
          canceled_subscriber?.items.data[0]?.plan.amount || 0;

        logger.info(
          { step: 'end_subscription', amount: canceled_amount * 0.01 },
          'Subscription ended',
        );

        // Retrieve from Stripe
        const canceled_member: any = await retrieveCustomer(customerID);
        logger.debug(canceled_member, 'Retrieved customer');

        // Record update in DB
        const update = `${canceled_member.name}'s ${dollar.format(canceled_amount * 0.01)} plan has ended`;
        const memberUpdate = {
          email: canceled_member.email,
          newTier: 0,
          update: update,
        };
        dbHelp.setMemberUpdate(memberUpdate, logger);

        // Update member in DB
        const canceledMember = {
          tier: 0,
          email: canceled_member.email,
          status: canceled_member.status ? canceled_member.status : 'canceled',
          amount: 0,
        };

        dbHelp.cancelMember(canceledMember, logger);

        return res.status(200).send('Subscription ended');
      }
      default:
        return res.status(405).send('Invalid or unneeded event type');
    }

    // create new email verification token
  } else {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }
}
