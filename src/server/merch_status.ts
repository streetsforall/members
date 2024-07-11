
'use server'

import sql from './db'

export async function merch_status(email: string) {
  console.log(email)

  // this returns all orders with the user email
  const orders = await sql`
      SELECT
        order_id
      FROM merch_orders
      WHERE email=${email}
      ORDER BY date DESC 
    `

  // 
  console.log('order_id', orders.length)

  if (orders) {

    try {

      // iterate through each merch order
      // return status 

      const order_packages = await orders.map(async (order) => {
        console.log(order)

        const requestOptions = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.PRINTFUL_KEY}`
          },
        };

        const response = await fetch(`https://api.printful.com/v2/orders/${order.order_id}/shipments`, requestOptions);
        const order_details = await response.json();

        if (order_details) {

          console.log('order_details.data', order_details.data)

          if (order_details.data.length == 0) {
            console.log(order.order_id, 'no order')
            return ('order canceled')
          }

          const orderstatus = order_details.data[0].shipment_status
          const tracking_url = order_details.data[0].tracking_url
          const delivery_status = order_details.data[0].delivery_status

          // update delivery status using order ID
          await sql`
    INSERT INTO merch_orders (order_id, delivery_status, order_status)
    VALUES(${order.order_id}, ${delivery_status}, ${orderstatus})
    ON CONFLICT (order_id) 
    DO UPDATE SET delivery_status = ${delivery_status}, order_status = ${orderstatus} 
    `

          console.log('package:', orderstatus, tracking_url, delivery_status)



          return ({
            'orderstatus': orderstatus,
            'tracking_url': tracking_url,
            'delivery_status': delivery_status
          })
        }
      })

      return (
        order_packages
      )
    }
    catch (error) {
      console.log('MERCH STATUS', error)
      return ('failed to retrieve orders')
    }
  }

  return ('no order ID')

}