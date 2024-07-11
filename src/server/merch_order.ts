'use server'

import sql from './db'

export async function new_order(data: any, tier: number) {

    // create printful order

    console.log('/// creating printful order')


    const shirt_size = data.size;

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

    // retrieve past orders
    // we need to make sure we aren't re-ordering merch to the same user

    const merch_orders = await sql`
      SELECT
        email,
        order_tier,
        order_package
      FROM merch_orders
      WHERE email = ${data.email};
    `

    console.log('merch_orders', merch_orders)

    // get any unique items ordered 
    let justPackages = merch_orders.flatMap(a => JSON.parse(a.order_package));
    const uniqueOrders = ([... new Set(justPackages)])    


    // these return undefined unless previously ordered, so we can use as bools
    const prevHat = uniqueOrders.find((e) => e == 'hat')
    const prevShirt = uniqueOrders.find((e) => e == 'shirt')
    const prevStick = uniqueOrders.find((e) => e == 'sticker')


    console.log(prevHat, prevShirt, prevStick)

    // create order packages
    var orderPackage = {}
    var orderList = {}


    // this is how we filter out historic merch orders
    if (tier == 1 && !prevStick) {
        // tier 1 order
        orderList = ['sticker']
        orderPackage = [sticker]
    } else if (tier == 2 && !prevStick && !prevShirt) {
        // tier 2 full
        orderList = ['sticker', 'shirt']
        orderPackage = [sticker, shirt]
    } else if (tier == 2 && !prevStick) {
        // tier 2 upgrade from tier 1
        orderList = ['shirt']
        orderPackage = [shirt]
    } else if (tier == 3 && !prevStick && !prevShirt  && !prevHat)  {
        // tier 3 full
        orderList = ['sticker', 'shirt', 'hat']
        orderPackage = [sticker, shirt, hat]
    } else if (tier == 3 && !shirt && !hat) {
        // tier 3 upgrade from tier 1
        orderList = ['shirt', 'hat']
        orderPackage = [shirt, hat]
    } else if (tier == 3 && !hat) {
        // tier 3 upgrade from tier 2
        orderList = ['hat']
        orderPackage = [hat]
    }

    console.log('orderPackage', orderPackage)
    

    const request_body = {
        "external_id": "",
        "shipping": "STANDARD",
        "recipient": {
            "name": data.name,
            "company": "",
            "address1": data.address1,
            "address2": data.address2,
            "city": data.city,
            "state_name": data.state_name,
            "state_code": data.state_name,
            "country_name": data.country_name,
            "country_code": data.country_name,
            "zip": data.zip,
            "phone": data.phone,
            "email": data.email
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

        const order_pack = JSON.stringify(orderList)

        await sql`
        INSERT INTO merch_orders (email, order_tier, date, order_id, delivered, shirt_size, order_package, order_status)
        VALUES(${data.email}, ${tier}, ${date}, ${order_details.data.id}, false, ${shirt_size} , ${order_pack}, ${order_details.data.status})
        `

        const retrieve_order = async ( ) => {
            const orderHeader = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.PRINTFUL_KEY}`
                }
            };
            const order_response = await fetch(`https://api.printful.com/v2/orders/${order_details.data.id}/confirmation`, orderHeader);
            const order = await order_response.json();
            console.log('order created', order)
        }

        setTimeout(function(){
        // submit order to printful 
        // takes a sec for them to create pricing
        // so we give it 10 seconds
            retrieve_order()
        }, 12000);
       

    } catch (err: any) {
        // On error, log and return the error message
        console.log(`❌ Error message: ${err.message}`);
    }


    // add order to database

}