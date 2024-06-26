'use server'

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export async function Billing_button(member: any) {

  const billingData = await stripe.billingPortal.sessions.create({
    customer: member.customer.id,
    return_url: process.env.ROOT_URL + '/u/' + member.member.id
  })

  console.log('data', billingData)

  if (member.customer.id) {
    return (
        <a href={billingData.url}> <button>Manage billing</button></a>
    )

  } else {
    'no stripe customer id'
  }
}
