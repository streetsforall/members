'use server'

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export async function Upgrade_button(member: any) {


  const customerID = member.member.customer_id
  console.log(member.member.subscription_id)

  if (member.member.subscription_id) {

    try {

      const session = await stripe.billingPortal.sessions.create({
        customer: member.member.customer_id,
        return_url: process.env.ROOT_URL + '/u/' + customerID,
        flow_data: {
          type: 'subscription_update',
          subscription_update: {
            subscription: member.member.subscription_id,
          },
        },
      });
      return (
        <a href={session.url}> <button>Upgrade Membership</button></a>
        // <a href=''> <button>Upgrade Membership</button></a>
      )
    } catch (error) {
      console.log(error)
      return ('no sub ID')
    }


  } else {
    return (<button>no sub ID</button>)
  }

}

