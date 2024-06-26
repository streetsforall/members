import { NextApiRequest, NextApiResponse } from "next";
import { DonationData } from "./donation.types";
import * as dbHelp from '../../server/dbHelpers'
import { buffer } from "micro";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_TEST as string, {});

export const config = {
  api: {
    bodyParser: false,
  },
};


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  if (req.method === "POST") {

    // stripe validation needs RAW body which Next.js automatically parses, this allows us to get around
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"] as string;
    const STRIPE_HOOK_TEST = 'whsec_b1cd68f70bf4312a55f11e01c6c2db9f3b4ba69bd2f4af0bfb80e94d509f69b3'

    let api_event;

    try {
      // validate webook came frome stripe
      api_event = await stripe.webhooks.constructEvent(buf, sig, STRIPE_HOOK_TEST);
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

    // iterate through various stripe webhook event types
    switch (api_event.type) {

      // NEW MEMBER SUBSCRIPTION
      case 'customer.subscription.created':
        const new_subscriber = api_event.data.object;
        // console.log('new_subscriber', new_subscriber);
        customerID = new_subscriber.customer as string

        const new_member = await retrieveCustomer(customerID)

        // console.log("new_subscriber.items.data", new_subscriber.items.data)
        const amount = new_subscriber.plan.amount

        if (amount >= 4800) {
          var tier = 3
        } else if (amount >= 2400)  {
          var tier = 2
        } else if (amount >= 1200)  {
          var tier = 1
        } else {
          var tier = 0
        }

        if (new_member.shipping) {
          const address =  new_member.shipping.address
        } else {
          const address =  null
        }

        var email = 'test@test.com'
        if (new_member.email) {
          email = new_member.email
        }


        const memberObj = {
          'tier':tier,
          'name': new_member.name,
          'phone': new_member.phone,
          'email': email,
          'shipping_address': new_member.shipping,
          'amount': amount/100,
          'customer_id': customerID
        }

        dbHelp.setMember(memberObj)

        console.log(memberObj)

        res.status(200).end("New Subscriber Successful");

        break;

      // MEMBER SUBSCRIPTION UPDATED 
      case 'customer.subscription.updated':
        const updated_subscriber = api_event.data.object;
        console.log('updated_subscriber', updated_subscriber);
        customerID = updated_subscriber.customer as string

        const member = await retrieveCustomer(customerID)
        console.log(member)

        res.status(200).end("Subscriber Updated Successful");
        break;


      // MEMBER SUBSCRIPTION CANCELED 
      case 'customer.subscription.deleted':
        const canceled_subscriber = api_event.data.object;
        console.log('updated_subscriber', canceled_subscriber);
        customerID = await canceled_subscriber.customer as string


        const canceled_member = retrieveCustomer(customerID)
        console.log(canceled_member)

        res.status(200).end("Subscriber Canceled Successful");
        break;



      default:

        // Unexpected event type
        // console.log(`Unhandled event type ${api_event.type}.`);
        res.status(405).end("Invalid or unneeded event type");
    }


    // create new email verification token

  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
}