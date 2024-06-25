import { NextApiRequest, NextApiResponse } from "next";
import { DonationData } from "./donation.types";
import * as dbHelp from '../../server/dbHelpers'
// endpoint for stripe

const stripe = require('stripe')(process.env.STRIPE_TEST);


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  
  const auth = req.headers.authorization;

  if (req.method === "POST") {
    const donationData = req.body;

    if (process.env.STRIPE_HOOK_SECRET) {
      // Get the signature sent by Stripe
      const signature = req.headers['stripe-signature'];

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          process.env.STRIPE_HOOK_SECRET
        );
      } catch (error) {
        console.log(`⚠️  Webhook signature verification failed.`);
        return res.status(400);
      }
    }

    console.log(donationData)

    if (!donationData) {
      res.status(400).json({ message: "Missing donation data" });
      return;
    }


    // create new email verification token
    const verificationToken = dbHelp.setEmailVerification(donationData.donor.email)

    res.status(200).json({ message: "Webhook data received" });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}