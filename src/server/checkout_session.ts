'use server'

const stripe = require('stripe')(process.env.STRIPE_TEST);
import {loadStripe} from '@stripe/stripe-js';

const stripe_session = async () => {

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        ui_mode: 'embedded',
        line_items: [
            {
                price: '{{PRICE_ID}}',
                quantity: 1,
            },
        ],

        return_url: process.env.ROOT_URL + '/u/return?session_id={CHECKOUT_SESSION_ID}',
    });
    console.log(session)
    return (session)
}

export async function stripePromise() {
    console.log('stripe')
    return (loadStripe(process.env.STRIPE_TEST as string, {}))
}

// export const stripe_key = process.env.STRIPE_TEST as string

export async function fetchClientSecret() {
    console.log('stripe', process.env.STRIPE_TEST)
    return (stripe_session())
}
