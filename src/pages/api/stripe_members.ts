import { NextApiRequest, NextApiResponse } from "next";
import * as dbHelp from '../../server/dbHelpers'
import { new_order } from '@/server/merch_order'
import { buffer } from "micro";
import Stripe from "stripe";
import { new_signup_email } from '@/server/email_token'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {});

export const config = {
  api: {
    bodyParser: false,
  },
};


const validateTier = (payment: number) => {
  var tier = 0
  // validate payment
  if (payment >= 4800) {
    var tier = 3
  } else if (payment >= 2400) {
    var tier = 2
  } else if (payment >= 1200) {
    var tier = 1
  }

  return (tier)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  if (req.method === "POST") {

    // stripe validation needs RAW body which Next.js automatically parses, this allows us to get around
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"] as string;
    const STRIPE_HOOK = process.env.STRIPE_HOOK_SECRET as string

    let api_event;

    try {
      // validate webook came frome stripe
      console.log(buf, sig, STRIPE_HOOK)
      api_event = await stripe.webhooks.constructEvent(buf, sig, STRIPE_HOOK);
      console.log('api_event', api_event)
    } catch (err: any) {
      // On error, log and return the error message
      console.log(`❌ Error message: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }


    var customerID = ''

    // stripe doesn't pass customer information in their webhooks
    // we have to call it seperately
    const retrieveCustomer = async (customerID: string) => {
      const customer = await stripe.customers.retrieve(customerID);
      return (customer)
    }

    console.log(api_event.type)

    // iterate through various stripe webhook event types
    switch (api_event.type) {

      // we use this to grab the shirt size
      // weirdly the only stipe API call that forwards custom fields
      case 'checkout.session.completed':
        const checkout: any = api_event.data.object;

        if (checkout.mode != 'subscription') {
          // make sure checkout is a subscription 
          res.status(200).end("Not a member subscription");
          break;
        }

        const checkout_tier = await validateTier(checkout.amount_total)

        new_order({
          "size": checkout.custom_fields[0].dropdown.value,
          "name": checkout.customer_details.name,
          "address1": checkout.shipping_details.address.line1,
          "address2": checkout.shipping_details.address.line2,
          "city": checkout.shipping_details.address.city,
          "state_name": checkout.shipping_details.address.state,
          "country_name": checkout.shipping_details.address.country,
          "zip": checkout.shipping_details.address.postal_code,
          "phone": checkout.customer_details.phone,
          "email": checkout.customer_details.email
        }, checkout_tier)

        new_signup_email(checkout.customer_details.email)

        res.status(200).end("New Member Succesful");

        break;

      // NEW MEMBER SUBSCRIPTION or UPDATED
      case 'customer.subscription.created':
      case 'customer.subscription.updated':

        const subscriber: any = api_event.data.object;
        const newMember = api_event.type == 'customer.subscription.created' ? true : false

        const check_tier = await validateTier(subscriber.plan.amount)  
        console.log(check_tier)
        console.log(subscriber)

        const prevAmount = api_event?.data?.previous_attributes?.items?.data[0]?.plan?.amount;


        customerID = subscriber.customer as string

        const new_member: any = await retrieveCustomer(customerID)
        const amount = subscriber.plan.amount

        // this is used to order new merch if someone upgrades
        if (api_event.type == 'customer.subscription.updated') {

          // only fire if sub amount changes
          if (subscriber.amount != prevAmount) {

            console.log('SUBSCRIPTION UPGRADE MERCH ORDER')

            const retrieveAllMerch = async (email: string) => {
              const order = await dbHelp.retrieveMerchOrders(email)
              return(order)
          }
  
            const merch = await retrieveAllMerch(new_member.email)
            const size = merch[0].shirt_size;
            console.log('shirt size', size)

            new_order({
              "size": size,
              "name": new_member.name,
              "address1": new_member.address.line1,
              "address2": new_member.address.line2,
              "city": new_member.address.city,
              "state_name": new_member.address.state,
              "country_name": new_member.address.country,
              "zip": new_member.address.postal_code,
              "phone": new_member.phone,
              "email": new_member.email
            }, check_tier)
          }

        }




        var address = {}
        // validate shipping address
        if (new_member.shipping) {
          address = new_member.shipping.address
        } else {
          address = 'no address'
        }

        var tier = validateTier(amount)

        console.log(new_member)

        const memberObj = {
          'tier': tier,
          'name': new_member.name,
          'phone': new_member.phone,
          'email': new_member.email,
          'status': new_member.status,
          'shipping_address': JSON.stringify(address),
          'amount': amount / 100,
          'customer_id': customerID,
          'newMember': newMember,
          'subID': subscriber.id,
        }

        // pass member to database
        dbHelp.setMember(memberObj)

        res.status(200).end("New Subscriber Successful");

        break;

      // MEMBER SUBSCRIPTION CANCELED 
      // this fires not when the member cancels, but when the last billing cycle is complete
      // i.e. a canceled member can still access their page until a month after canceling 

      case 'customer.subscription.deleted':
        console.log('SUBSCRIPTION CANCELING')
        const canceled_subscriber = api_event.data.object;
        console.log('canceled_subscriber', canceled_subscriber);
        customerID = canceled_subscriber.customer as string

        const canceled_member: any = await retrieveCustomer(customerID)
        console.log(canceled_member)

        var email = 'test@test.com'
        if (canceled_member.email) {
          email = canceled_member.email
        }

        const canceledMember = {
          'tier': 0,
          'email': email,
          'status': canceled_member.status ? canceled_member.status : 'canceled',
          'amount': 0,
        }
        dbHelp.cancelMember(canceledMember)

        res.status(200).end("Subscriber Canceled Successful");
        break;

      default:
        res.status(405).end("Invalid or unneeded event type");
    }


    // create new email verification token

  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
}