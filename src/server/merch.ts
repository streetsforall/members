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
    var shirtID = ''
    if (shirt_size == 's') {
        shirtID = '#27636855-fe47-4702-8a97-2a8e03b9768c'
    } else if (shirt_size == 'm') {
        shirtID = '#d32be939-cb43-467b-900e-6ae21e5a3598'
    } else if (shirt_size == 'l') {
        shirtID = '#9a029bf3-ad3d-4992-8b6a-fd934363333e'
    } else if (shirt_size == 'xl') {
        shirtID = '#b5c3950b-10cf-46d1-882a-e4e6f802586a'
    } else if (shirt_size == '2xl') {
        shirtID = '#3a02c650-806c-4159-95ca-44981f96076c'
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
        "sync_variant_id": '#401aad0c-b1f0-46e5-b8ea-134f4e362551',
        "quantity": 1,
        "name": "Members Sticker sheet"
    }

    const hat = {
        "source": 'sync',
        "sync_variant_id": '#5f103f57-981c-43ff-b211-7ada1fe09a97',
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

        console.log('order',order_details)
        console.log('order links',order_details.data._links)
        console.log('order items',order_details.data.order_items)

    } catch (err: any) {
        // On error, log and return the error message
        console.log(`❌ Error message: ${err.message}`);
    }


    // add order to database

}