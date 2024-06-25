'use server'

const stripe = require('stripe')(process.env.STRIPE_TEST);

export async function Billing_button(member: any) {

  const billingData = await stripe.billingPortal.sessions.create({
    customer: 'cus_QM0elZKjMwdEYL',
    return_url: process.env.ROOT_URL + '/u/' + member.member.id
  })

  console.log('data', billingData)

  if (billingData) {
    return (
        <a href={billingData.url}> <button>Manage billing</button></a>
    )

  }
}
