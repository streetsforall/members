"use server"

import * as React from 'react';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';
import {fetchClientSecret} from '@/server/checkout_session'
import {loadStripe} from '@stripe/stripe-js';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {})

const Portal = async () => {

  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Cactus Practice partners with Stripe for simplified billing.',
    },
    features: {
      invoice_history: {
        enabled: true,
      },
    },
  });
}

export default Portal