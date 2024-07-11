
'use server'

import sql from './db'

export async function merch_status(email: string) {


  const requestOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.PRINTFUL_KEY}`
    },
  };

  const getMerch = async (order: string) => {
    try {

      // this is printful API v1 which might need to be upgraded at somepoint

      return fetch(`https://api.printful.com/orders/${order}`, requestOptions)
        .then((response) => response.json())
        .then((responseJson) => { return responseJson });
    } catch (error) {
      console.error(error);
    }

  }


  // this returns all orders with the user email
  const orders = await sql`
      SELECT
        order_id,
        email,
        delivery_status,
        order_status,
        order_package
      FROM merch_orders
      WHERE email=${email}
      ORDER BY date DESC 
    `

  if (orders) {

    try {

      // iterate through each merch order
      // return status 



      const order_packages = await orders.map(async (order, id) => {
        console.log(`order ${id}`, order)

        // const getMerch = async () => {
        //   try {
        //     const response = await fetch(`https://api.printful.com/v2/orders/${order.order_id}/shipments`, requestOptions);

        //     if (!response.ok) {
        //       throw new Error(`Response status: ${response.status}`);
        //     }
        //     const json = await response.json();
        //     console.log('json', json);
        //     return (json)

        //   } catch (error) {
        //     console.error(error);
        //   }
        // }




        const order_details = await getMerch(order.order_id)

        console.log('order_details', order_details)

        if (!order_details) {
          console.log(order.order_id, 'no order')
          return ([{ status: 'order canceled' }])
        }

        const orderstatus = order_details.result.status
        const tracking_url = 'tbd'

        const delivery_status = order_details.result.shipments[0] ? 
         order_details.result.shipments[0].tracking_url : ''

        console.log(orderstatus, tracking_url)

        // update delivery status using order ID
        await sql`
        INSERT INTO merch_orders (order_id, delivery_status, order_status)
        VALUES(${order.order_id}, ${delivery_status}, ${orderstatus})
        ON CONFLICT (order_id) 
        DO UPDATE SET delivery_status = ${delivery_status}, order_status = ${orderstatus} 
        `

        console.log('package:', orderstatus, tracking_url, delivery_status)



        return ([{
          'status': ''
        }])
      })

      return (
        order_packages
      )
    }
    catch (error) {
      console.log('MERCH STATUS', error)
      return ([{ 'status': 'failed to retrieve orders' }])
    }
  }

  return ('no order ID')

}