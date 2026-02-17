"use server";

import pino from 'pino';
import sql from "./db";

// Used for any loggers not passed as arguments
const parentLogger = pino();

export async function new_order(data: any, tier: number) {
  // create printful order

  parentLogger.info("/// creating printful order");

  const shirt_size = data.size;

  // set shirt size
  // note for future: was painful to figure this out but you can only find the sync_variant_id
  // by requesting all items from that product ID from the Printful API
  // GET /sync/products/{ID}

  // example formatting from BDSM shirt
  // id 97286569
  // sync_variant_id 4702140382
  // external_id 679bcd6caec4700697940058

  // this has now shifted to product template

  // create products from sync variant

  var shirtID = 0
  if (shirt_size == 's') {
      shirtID = 4433819851
  } else if (shirt_size == 'm') {
      shirtID = 4433819852
  } else if (shirt_size == 'l') {
      shirtID = 4433819853
  } else if (shirt_size == 'xl') {
      shirtID = 4433819854
  } else if (shirt_size == '2xl') {
      shirtID = 4433819855
  }

  // create products
  const shirt = {
    "id": 1,
      "source": 'sync',
      "sync_variant_id": shirtID,
      "quantity": 1,
      "name": "Membership T-Shirt"
  }

  const sticker = {
    "id": 2,
      "source": 'sync',
      "sync_variant_id": 4433819998,
      "quantity": 1,
      "name": "Members Sticker sheet"
  }

  const hat = {
    "id": 3,
      "source": 'sync',
      "sync_variant_id": 4434444449,
      "quantity": 1,
      "name": "Members Dad Hat"
  }

  const tote = {
      "source": 'sync',
      "sync_variant_id": 3700186093,
      "quantity": 1,
      "name": "Streets For All Tote Bag "
  }

  // NEW
  // create products from Product Template

  // var shirtID = "";
  // if (shirt_size == "s") {
  //   shirtID = "27636855-fe47-4702-8a97-2a8e03b9768c";
  // } else if (shirt_size == "m") {
  //   shirtID = "d32be939-cb43-467b-900e-6ae21e5a3598";
  // } else if (shirt_size == "l") {
  //   shirtID = "9a029bf3-ad3d-4992-8b6a-fd934363333e";
  // } else if (shirt_size == "xl") {
  //   shirtID = "b5c3950b-10cf-46d1-882a-e4e6f802586a";
  // } else if (shirt_size == "2xl") {
  //   shirtID = "3a02c650-806c-4159-95ca-44981f96076c";
  // }

  // if (!shirt_size || shirtID === "") {
  //   parentLogger.info("Invalid shirt size");
  //   return { error: "Invalid shirt size selected" };
  // }

  // const shirt = {
  //   source: "product_template",
  //   product_template_id: "6684375a27bc3208286138e1",
  //   catalog_variant_id: shirtID,
  //   quantity: 1,
  //   name: "Membership T-Shirt",
  // };

  // const sticker = {
  //   source: "product_template",
  //   product_template_id: "401aad0c-b1f0-46e5-b8ea-134f4e362551",
  //   catalog_variant_id: "4433819998",
  //   quantity: 1,
  //   name: "Members Sticker sheet",
  // };

  // const hat = {
  //   source: "product_template",
  //   product_template_id: "4434444449",
  //   catalog_variant_id: "7857",
  //   quantity: 1,
  //   name: "Members Dad Hat",
  // };

  // const tote = {
  //     "source": 'product_template',
  //     "variant_id": 3700186093,
  //     "quantity": 1,
  //     "name": "Streets For All Tote Bag "
  // }

  // retrieve past orders
  // we need to make sure we aren't re-ordering merch to the same user

  const merch_orders = await sql`
      SELECT
        email,
        order_tier,
        order_package
      FROM merch_orders
      WHERE email = ${data.email};
    `;

  // parentLogger.info(merch_orders, 'merch_orders')

  // get any unique items ordered
  let justPackages = merch_orders.flatMap((a) => JSON.parse(a.order_package));
  const uniqueOrders = [...new Set(justPackages)];

  // these return undefined unless previously ordered, so we can use as bools
  const prevHat = uniqueOrders.find((e) => e == "hat");
  const prevShirt = uniqueOrders.find((e) => e == "shirt");
  const prevStick = uniqueOrders.find((e) => e == "sticker");

  // create order packages
  var orderPackage: any[] = [];
  var orderList = {};

  // this is nasty but how we filter out historic merch orders

  if (tier == 1) {
    if (prevStick) {
      parentLogger.info("tier 1: sticker already ordered");
    } else {
      parentLogger.info("tier 1: full order");
      orderList = ["sticker"];
      orderPackage = [sticker];
    }
  } else if (tier == 2) {
    if (prevShirt && prevStick) {
      parentLogger.info("tier 2: sticker and shirt ordered");
    } else if (prevStick) {
      parentLogger.info("tier 2: sticker already ordered");
      orderList = ["shirt"];
      orderPackage = [shirt];
    } else {
      parentLogger.info("tier 2: full order");
      orderList = ["sticker", "shirt"];
      orderPackage = [sticker, shirt];
    }
  } else if (tier == 3) {
    if (prevShirt && prevStick && prevHat) {
      parentLogger.info("tier 3: sticker and shirt and hat already ordered");
    } else if (prevStick && prevShirt) {
      parentLogger.info("tier 3: sticker and shirt already ordered");
      orderList = ["hat"];
      orderPackage = [hat];
    } else if (prevStick) {
      parentLogger.info("tier 3: sticker already ordered");
      orderList = ["shirt", "hat"];
      orderPackage = [shirt, hat];
    } else {
      parentLogger.info("tier 3: full order");
      orderList = ["sticker", "shirt", "hat"];
      orderPackage = [sticker, shirt, hat];
    }
  } else {
    parentLogger.info("no valid orders");
    return "no valid orders";
  }

  parentLogger.info(orderPackage, "orderPackage " + orderPackage.length);

  // don't create empty orders
  if (orderPackage && orderPackage.length) {
    const request_body = {
      external_id: "",
      shipping: "STANDARD",
      recipient: {
        name: data.name || "",
        company: data.company || "",
        address1: data.address1 || "",
        address2: data.address2 || "",
        city: data.city || "",
        state_name: data.state_name || "",
        state_code: data.state_name || "",
        country_name: data.country_name || "",
        country_code: data.country_name || "",
        zip: data.zip || "",
        phone: data.phone || "",
        email: data.email || "",
      },
      items: orderPackage,
    };

    parentLogger.info(request_body, "order request_body");

    try {
      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.PRINTFUL_KEY}`,
        },
        body: JSON.stringify(request_body),
      };

      const response = await fetch(
        "https://api.printful.com/orders",
        requestOptions
      );
      
      const order_details = await response.json();

      if (!response.ok) {
        const errorText = await response.text();
        parentLogger.error(`Printful API error: ${response.status}, ${errorText}`);
        return { error: `API Error: ${response.status}` };
      }

      parentLogger.info(order_details, "order_details response");

      // add order to database
      const date = new Date().toLocaleString("en-US");
      const order_pack = JSON.stringify(orderList);

      parentLogger.info('adding merch order to DB')
      await sql`
        INSERT INTO merch_orders (email, order_tier, date, order_id, delivered, shirt_size, order_package, order_status)
        VALUES(${data.email}, ${tier}, ${date}, ${order_details.result.id}, false, ${shirt_size} , ${order_pack}, ${order_details.result.status})
        `;

      const retrieve_order = async () => {
        const orderHeader = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.PRINTFUL_KEY}`,
          },
        };
        const order_response = await fetch(
          `https://api.printful.com/orders/${order_details.result.id}/confirm`,
          orderHeader
        );
        const order = await order_response.json();
        parentLogger.info(order, "order created");
      };

      setTimeout(function () {
        // submit order to printful
        // takes a sec for them to create pricing
        // so we give it 10 seconds
        retrieve_order();
      }, 12000);
    } catch (err: any) {
      // On error, log and return the error message
      parentLogger.error(`❌ Error message: ${err.message}`);
    }
  } else {
    parentLogger.info("order is empty - likely already ordered");
  }

  // add order to database
}
