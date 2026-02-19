'use server';

import { type Logger } from 'pino';
import sql from './db';

/**
 * Create Printful order
 * @param data - Customer information
 * @param tier - Membership tier
 * @returns
 */
export async function new_order(
  data: {
    size: 'S' | 'M' | 'L' | 'XL' | '2XL' | 's' | 'm' | 'l' | 'xl' | '2xl';
    name: string;
    address1: string;
    address2: string;
    city: string;
    state_name: string;
    country_name: string;
    zip: string;
    phone: string;
    email: string;
  },
  tier: number,
  logger: Logger,
) {
  /**
   * Prepare shirt for Printful order
   */
  const shirt_size = data.size;

  // Set shirt size variant ID
  let shirtID = 0;
  if (shirt_size == 's') {
    shirtID = 4433819851;
  } else if (shirt_size == 'm') {
    shirtID = 4433819852;
  } else if (shirt_size == 'l') {
    shirtID = 4433819853;
  } else if (shirt_size == 'xl') {
    shirtID = 4433819854;
  } else if (shirt_size == '2xl') {
    shirtID = 4433819855;
  }

  // Create Printful product structure
  const shirt = {
    id: 1,
    source: 'sync',
    sync_variant_id: shirtID,
    quantity: 1,
    name: 'Membership T-Shirt',
  };

  const sticker = {
    id: 2,
    source: 'sync',
    sync_variant_id: 4433819998,
    quantity: 1,
    name: 'Members Sticker sheet',
  };

  const hat = {
    id: 3,
    source: 'sync',
    sync_variant_id: 4434444449,
    quantity: 1,
    name: 'Members Dad Hat',
  };

  const tote = {
    source: 'sync',
    sync_variant_id: 3700186093,
    quantity: 1,
    name: 'Streets For All Tote Bag',
  };

  /* NEW
  Create products from Product Template instead of sync product variants

  var shirtID = "";
  if (shirt_size == "s") {
    shirtID = "27636855-fe47-4702-8a97-2a8e03b9768c";
  } else if (shirt_size == "m") {
    shirtID = "d32be939-cb43-467b-900e-6ae21e5a3598";
  } else if (shirt_size == "l") {
    shirtID = "9a029bf3-ad3d-4992-8b6a-fd934363333e";
  } else if (shirt_size == "xl") {
    shirtID = "b5c3950b-10cf-46d1-882a-e4e6f802586a";
  } else if (shirt_size == "2xl") {
    shirtID = "3a02c650-806c-4159-95ca-44981f96076c";
  }

  if (!shirt_size || shirtID === "") {
    parentLogger.info("Invalid shirt size");
    return { error: "Invalid shirt size selected" };
  }

  const shirt = {
    source: "product_template",
    product_template_id: "6684375a27bc3208286138e1",
    catalog_variant_id: shirtID,
    quantity: 1,
    name: "Membership T-Shirt",
  };

  const sticker = {
    source: "product_template",
    product_template_id: "401aad0c-b1f0-46e5-b8ea-134f4e362551",
    catalog_variant_id: "4433819998",
    quantity: 1,
    name: "Members Sticker sheet",
  };

  const hat = {
    source: "product_template",
    product_template_id: "4434444449",
    catalog_variant_id: "7857",
    quantity: 1,
    name: "Members Dad Hat",
  };

  const tote = {
      "source": 'product_template',
      "variant_id": 3700186093,
      "quantity": 1,
      "name": "Streets For All Tote Bag "
  } */

  /**
   * Make sure we aren't re-ordering merch for the same user
   */
  let childLogger = logger.child({
    step: 'check_previous_orders',
    tier,
    include_sticker: false,
    include_shirt: false,
    include_hat: false,
  });

  // Retrieve past orders
  const prevOrders = await sql`
    SELECT
      email,
      order_tier,
      order_package
    FROM merch_orders
    WHERE email = ${data.email};
  `;
  childLogger.debug(prevOrders, 'Retrieved previous orders');

  // Get any unique items ordered
  let packages = prevOrders.flatMap((a) => JSON.parse(a.order_package));
  const uniqueOrders = [...new Set(packages)];

  // Check if each item has been ordered previously - return undefined unless previously ordered, so we can use as booleans
  const prevHat = uniqueOrders.find((e) => e == 'hat');
  const prevShirt = uniqueOrders.find((e) => e == 'shirt');
  const prevStick = uniqueOrders.find((e) => e == 'sticker');

  // Create order packages
  let orderPackage: Array<{
    source: string;
    sync_variant_id: number;
    quantity: number;
    name: string;
  }> = [];
  let orderList = {};

  // This is nasty but how we filter out historic merch orders
  if (tier == 1) {
    if (prevStick) {
      childLogger.info('Sticker already ordered');
    } else {
      childLogger.info({ include_sticker: true }, 'Full order');

      orderList = ['sticker'];
      orderPackage = [sticker];
    }
  } else if (tier == 2) {
    if (prevShirt && prevStick) {
      childLogger.info('Sticker and shirt ordered');
    } else if (prevStick) {
      childLogger.info({ include_shirt: true }, 'Sticker already ordered');

      orderList = ['shirt'];
      orderPackage = [shirt];
    } else {
      childLogger.info(
        { include_shirt: true, include_sticker: true },
        'Full order',
      );

      orderList = ['sticker', 'shirt'];
      orderPackage = [sticker, shirt];
    }
  } else if (tier == 3) {
    if (prevShirt && prevStick && prevHat) {
      childLogger.info('Sticker and shirt and hat already ordered');
    } else if (prevStick && prevShirt) {
      childLogger.info(
        { include_hat: true },
        'Sticker and shirt already ordered',
      );

      orderList = ['hat'];
      orderPackage = [hat];
    } else if (prevStick) {
      childLogger.info(
        { include_hat: true, include_shirt: true },
        'Sticker already ordered',
      );

      orderList = ['shirt', 'hat'];
      orderPackage = [shirt, hat];
    } else {
      childLogger.info(
        { include_hat: true, include_shirt: true, include_sticker: true },
        'Full order',
      );

      orderList = ['sticker', 'shirt', 'hat'];
      orderPackage = [sticker, shirt, hat];
    }
  } else {
    childLogger.info('No valid orders');

    return 'No valid orders';
  }

  /**
   * Send order to Printful
   */
  // Don't create empty orders
  if (orderPackage && orderPackage.length) {
    logger.debug(orderPackage, 'Order package');

    const body = {
      external_id: '',
      shipping: 'STANDARD',
      recipient: {
        name: data.name || '',
        company: '',
        address1: data.address1 || '',
        address2: data.address2 || '',
        city: data.city || '',
        state_name: data.state_name || '',
        state_code: data.state_name || '',
        country_name: data.country_name || '',
        country_code: data.country_name || '',
        zip: data.zip || '',
        phone: data.phone || '',
        email: data.email || '',
      },
      items: orderPackage,
    };

    let orderId: number;

    // Create draft order in Printful
    childLogger = logger.child({ step: 'create_order' });
    try {
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PRINTFUL_KEY}`,
        },
        body: JSON.stringify(body),
      };

      const response = await fetch('https://api.printful.com/orders', options);
      const draftOrder = await response.json();

      if (!response.ok) {
        const message = draftOrder.error.message;

        throw new Error(message);
      }

      orderId = draftOrder.result.id;

      childLogger.info({ order_id: orderId }, 'Created order in Printful');

      // Add order to database
      const date = new Date().toLocaleString('en-US');
      const order_pack = JSON.stringify(orderList);

      await sql`
        INSERT INTO merch_orders (email, order_tier, date, order_id, delivered, shirt_size, order_package, order_status)
        VALUES(${data.email}, ${tier}, ${date}, ${orderId}, false, ${shirt_size} , ${order_pack}, ${draftOrder.result.status})
      `;
      childLogger.info(
        { order_id: orderId, tier, status: draftOrder.result.status },
        'Added order to database',
      );
    } catch (error) {
      childLogger.error(error);

      // Stop subsequent step if this one fails
      return;
    }

    // Confirm order in Printful for fulfillment
    childLogger = logger.child({ step: 'confirm_order' });
    try {
      const confirmOrder = async () => {
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.PRINTFUL_KEY}`,
          },
        };

        const response = await fetch(
          `https://api.printful.com/orders/${orderId}/confirm`,
          options,
        );
        const confirmedOrder = await response.json();

        if (!response.ok) {
          const message = confirmedOrder.error.message;

          throw new Error(message);
        }

        childLogger.info(
          { order_id: confirmedOrder.result.id },
          'Confirmed order in Printful',
        );

        // Update order status in database
        await sql`
          UPDATE merch_orders set order_status = ${confirmedOrder.result.status} WHERE order_id = ${confirmedOrder.result.id};
        `;
        childLogger.info(
          {
            order_id: confirmedOrder.result.id,
            status: confirmedOrder.result.status,
          },
          'Updated order status in database',
        );

        return confirmedOrder;
      };

      // Give 10 seconds for Printful to create pricing
      setTimeout(function () {
        return confirmOrder();
      }, 12000);
    } catch (error) {
      childLogger.error(error);

      return;
    }
  } else {
    logger.info('Order empty - likely already ordered');

    return 'Order empty - likely already ordered';
  }
}
