import { NextApiRequest, NextApiResponse } from "next";
import { useParams } from "next/navigation";

// returns total monthly donations

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
//   const prod_id = req.query.prod_id || "";
//   const cat_id = req.query.cat_id || "";

  const items = [
    {
      "id": 1,
      "source": 'sync',
      "sync_variant_id": 4433819998,
      "quantity": 1,
      "name": "Members Sticker sheet"
    },
  ];

  const request_body = {
    external_id: "",
    shipping: "STANDARD",
    recipient: {
      name: "Constance Jiang",
      company: "",
      address1: "358 S GRAMERCY PL APT 211",
      address2: "",
      city: "Los Angeles",
      state_name: "CA",
      state_code: "CA",
      country_name: "US",
      country_code: "US",
      zip: "90020",
      phone: "+18325201756",
      email: "ame.no.yoru@gmail.com",
    },
    items: items,
  };

  console.log("order request_body", request_body);

  try {
    // Step 1: Create order with address (this part remains the same)
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
    
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: true,
        status: response.status,
        message: `API Error when creating order: ${response.status}`,
        details: errorText
      });
    }
    
    const order_details = await response.json();
    
    console.log('order_details',order_details)

    // Wait if needed
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 2: Add multiple items to the order    
    // Array to store responses for each item addition

    console.log("order_details response", order_details);
    
  } catch (err) {
    return res.status(500).json({
      error: true,
      message: err.message || "Unknown error occurred",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
}
