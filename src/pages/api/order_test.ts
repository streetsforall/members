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
      source: "sync",
      sync_variant_id: 12917,
      product_template_id: 	350800543,
      quantity: 1,
      name: "Members Sticker sheet",
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
  };

  console.log("order request_body", request_body);

  try {
    // Step 1: Create order with address (this part remains the same)
    const addressRequestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.PRINTFUL_KEY}`,
      },
      body: JSON.stringify(request_body),
    };
    
    const addressResponse = await fetch(
      "https://api.printful.com/v2/orders",
      addressRequestOptions
    );
    
    if (!addressResponse.ok) {
      const errorText = await addressResponse.text();
      return res.status(addressResponse.status).json({
        error: true,
        status: addressResponse.status,
        message: `API Error when creating order: ${addressResponse.status}`,
        details: errorText
      });
    }
    
    const order_details = await addressResponse.json();
    const orderId = order_details.data.id;
    
    console.log('order_details',order_details)

    // Wait if needed
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 2: Add multiple items to the order    
    // Array to store responses for each item addition
    const itemResponses = [];
    
    // Process each item sequentially
    for (const item of items) {
      const itemRequestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.PRINTFUL_KEY}`,
        },
        body: JSON.stringify(item),
      };
      
      const itemResponse = await fetch(
        `https://api.printful.com/v2/orders/${orderId}/order-items`,
        itemRequestOptions
      );
      
      const itemResponseData = await itemResponse.text();
      
      try {
        // Try to parse as JSON if possible
        const itemResponseJson = JSON.parse(itemResponseData);
        console.log(itemResponseJson)
        itemResponses.push({
          success: itemResponse.ok,
          status: itemResponse.status,
          data: itemResponseJson,
          item: item
        });
      } catch (e) {
        // If not valid JSON, store as text
        itemResponses.push({
          success: itemResponse.ok,
          status: itemResponse.status,
          text: itemResponseData,
          item: item
        });
      }
      
      // If an item addition fails, you might want to handle it differently
      // For now, we continue with the next item regardless
    }
    
    // Check if all items were added successfully
    const allItemsSuccessful = itemResponses.every(response => response.success);
    console.log('allItemsSuccessful', allItemsSuccessful)
    
    // Return complete response with all results
    return res.status(allItemsSuccessful ? 200 : 207).json({
      success: allItemsSuccessful,
      order_details: order_details,
      items_results: itemResponses
    });
    
  } catch (err) {
    return res.status(500).json({
      error: true,
      message: err.message || "Unknown error occurred",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
}
