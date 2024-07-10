'use server'

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export async function Upgrade_button(member: any) {


    const customerID = member.member.customer_id

  if (customerID) {

    const retrieveCustomer = async (customerID  : string) => {
        const customer = await stripe.customers.retrieve(customerID);
        return (customer)
    }

    // console.log(retrieveCustomer(customerID))

    const members = await retrieveCustomer(customerID)
    console.log(members)


    // const session = await stripe.billingPortal.sessions.create({
    //     customer: member.member.customer_id,
    //     return_url: process.env.ROOT_URL + '/u/' + customerID,
    //     flow_data: {
    //       type: 'subscription_update',
    //       subscription_update: {
    //         subscription: '{{SUBSCRIPTION_ID}}',
    //       },
    //     },
    //   });
    return (
    //   <a href={session.url}> <button>Upgrade Membership</button></a>
      <a href=''> <button>Upgrade Membership</button></a>
    )

  } else {
    return (<button>no stripe customer id</button>)
  }

}

