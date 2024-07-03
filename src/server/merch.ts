'use server'

import sql from './db'

export async function new_order(data: any, tier: number) {

    // create printful order

    console.log('creating shirt order')
    console.log(data)
    console.log(data.custom_fields)
    console.log('custom_field 2', data.custom_fields[0].dropdown)

    const shirt_size = data.custom_fields[0].dropdown.value;

    // set shirt size
    // note for future: was painful to figure this out but you can only find the sync_variant_id 
    // by requesting all items from that product ID from the Printful API
    // GET /sync/products/{ID}

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
        "source": 'sync',
        "sync_variant_id": shirtID,
        "quantity": 1,
        "name": "Membership T-Shirt"
    }

    const sticker = {
        "source": 'sync',
        "sync_variant_id": 4433819998,
        "quantity": 1,
        "name": "Members Sticker sheet"
    }

    const hat = {
        "source": 'sync',
        "sync_variant_id": 4434444449,
        "quantity": 1,
        "name": "Members Dad Hat"
    }

    // create order packages
    var orderPackage = {}
    if (tier == 1) {
        orderPackage = [sticker]
    } else if (tier == 2) {
        orderPackage = [sticker, shirt]
    } else if (tier == 3) {
        orderPackage = [sticker, shirt, hat]
    }

    console.log('orderPackage', orderPackage)

    const request_body = {
        "external_id": "",
        "shipping": "STANDARD",
        "recipient": {
            "name": data.customer_details.name,
            "company": "",
            "address1": data.shipping_details.address.line1,
            "address2": data.shipping_details.address.line2,
            "city": data.shipping_details.address.city,
            "state_name": data.shipping_details.address.state,
            "state_code": data.shipping_details.address.state,
            "country_name": data.shipping_details.address.country,
            "country_code": data.shipping_details.address.country,
            "zip": data.shipping_details.address.postal_code,
            "phone": data.customer_details.phone,
            "email": data.customer_details.email
        },
        "order_items": orderPackage,
        "customization": {},
        "retail_costs": {}
    }

    console.log(request_body)

    try {

        // create order with printful
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.PRINTFUL_KEY}`
            },
            body: JSON.stringify(request_body)
        };
        const response = await fetch('https://api.printful.com/v2/orders', requestOptions);
        const order_details = await response.json();
        console.log('order created')


        // add order to database
        const date = (new Date()).toLocaleString("en-US")

        await sql`
        INSERT INTO merch_orders (email, order_tier, date, order_id, delivered)
        VALUES(${data.customer_details.email}, ${tier}, ${date}, ${order_details.data.id}, false)
        `

        // submit order to printful 
        const orderHeader = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.PRINTFUL_KEY}`
            },
        };
        const order_response = await fetch(`https://api.printful.com/v2/orders/{order_details.data.id}/confirmation`, orderHeader);
        const order = await response.json();
        console.log('order created', order)

    } catch (err: any) {
        // On error, log and return the error message
        console.log(`❌ Error message: ${err.message}`);
    }


    // add order to database

}