
'use server'

import sql from './db'

export async function merch_status(email: string) {
  console.log(email)

  const order_id = await sql`
      SELECT
        order_id
      FROM merch_orders
      WHERE email=${email}
      ORDER BY date DESC 
    `

    console.log(order_id)


  if (order_id[0]) {
    const recent_order = order_id[0].order_id

    console.log(recent_order)

    const requestOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PRINTFUL_KEY}`
      },
    };

    const response = await fetch(`https://api.printful.com/v2/orders/${recent_order}/shipments`, requestOptions);
    const order_details = await response.json();

    const orderstatus = order_details.data[0].shipment_status
    const tracking_url = order_details.data[0].tracking_url
    const delivery_status = order_details.data[0].delivery_status

    // update delivery status using order ID
    await sql`
    INSERT INTO merch_orders (order_id, delivery_status, order_status)
    VALUES(${recent_order}, ${delivery_status}, ${orderstatus})
    ON CONFLICT (order_id) 
    DO UPDATE SET delivery_status = ${delivery_status}, order_status = ${orderstatus} 
    `

    console.log('package:', orderstatus, tracking_url, delivery_status)



    return ({
      'orderstatus': orderstatus,
      'tracking_url': tracking_url,
      'delivery_status': delivery_status
    })

  } else {
    return ({
      'orderstatus': 'no order',
      'tracking_url':  'no order',
      'delivery_status':  'no order'
    })
  }


}