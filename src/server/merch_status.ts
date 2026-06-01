'use server';

import { getOrders, updateOrderStatus } from './db';

export async function merch_status(email: string) {
  const requestOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PRINTFUL_KEY}`,
    },
  };

  const getMerch = async (order: string) => {
    try {
      // this is printful API v1 which might need to be upgraded at somepoint

      return fetch(`https://api.printful.com/orders/${order}`, requestOptions)
        .then((response) => response.json())
        .then((responseJson) => {
          return responseJson;
        });
    } catch (error) {
      console.error(error);
    }
  };

  // this returns all orders with the user email
  const orders = await getOrders(email);

  if (orders) {
    try {
      // iterate through each merch order
      // return status

      const order_packages = await orders.map(async (order, id) => {
        const order_details = await getMerch(order.order_id);

        // console.log('order_details', order_details)

        if (!order_details) {
          console.log(order.order_id, 'no order');
          return [{ status: 'order canceled' }];
        }

        const orderstatus = order_details.result.status;
        const tracking_url = 'tbd';

        const delivery_status = order_details.result.shipments[0]
          ? order_details.result.shipments[0].tracking_url
          : null;

        // console.log(orderstatus, tracking_url)

        // update delivery status using order ID
        await updateOrderStatus({
          orderId: order.order_id,
          status: orderstatus,
          deliveryStatus: delivery_status,
        });

        console.log('package:', orderstatus, tracking_url, delivery_status);

        return [
          {
            status: '',
          },
        ];
      });

      return order_packages;
    } catch (error) {
      console.log('MERCH STATUS', error);
      return [{ status: 'failed to retrieve orders' }];
    }
  }

  return 'no order ID';
}
