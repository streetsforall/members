'use server'

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export async function Billing_button(member: any) {

  if (member.member.customer_id) {
    const billingData = await stripe.billingPortal.sessions.create({
      customer: member.member.customer_id,
      return_url: process.env.ROOT_URL + '/u/' + member.member.id
    })

    return (
      <a href={billingData.url}> <button className="light_butt">Manage billing</button></a>
    )

  } else {
    return (<button>no stripe customer id</button>)
  }

}

