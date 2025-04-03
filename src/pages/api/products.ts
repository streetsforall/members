import { NextApiRequest, NextApiResponse} from "next";

// returns total monthly donations

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
    // params: { params: Promise<{ id: string }> }
) {

    const product_id = '350800543'

    if (req.method === "GET") {
        try {

            const requestOptions = {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.PRINTFUL_KEY}`
                },
            };

            const response = await fetch(`https://api.printful.com/sync/products/${product_id}`, requestOptions);
            const order_details = await response.json();


            res.status(200).send({
                order_details
        })

        } catch (error: any) {
            if (error instanceof Error) {
                console.error(`An error occurred counting members: ${error.message}`);
            }

            res.status(500).send("An error occurred counting members");
        }
    }
}