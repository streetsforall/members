

//   async function getAllSquarespaceOrders(startDate: string, endDate: string) {
//     let allOrders: Array<String> = [];
//     let currentUrl = `https://api.squarespace.com/1.0/commerce/orders?modifiedAfter=${startDate}&modifiedBefore=${endDate}`;
//     let hasNextPage = true;
//     let pageCount = 0;
//     const maxPages = 100; // Safety limit to prevent infinite loops

//     console.log(currentUrl);

//     try {
//       while (hasNextPage && pageCount < maxPages) {
//         console.log(`Fetching page ${pageCount + 1}...`);

//         const response = await fetch(currentUrl, {
//           headers: {
//             Authorization: `Bearer ${API_KEY}`,
//             "User-Agent": "NextJS-Squarespace-Integration/1.0",
//             "Content-Type": "application/json",
//           },
//         });

//         if (!response.ok) {
//           const errorData = await response.json().catch(() => ({}));
//           throw new Error(
//             `API Error: ${response.status} - ${
//               errorData.message || response.statusText
//             }`
//           );
//         }

//         const data = await response.json();

//         // add orders from this page to array
//         if (data.result && Array.isArray(data.result)) {
//           allOrders = [...allOrders, ...data.result];
//           console.log(
//             `Added ${data.result.length} orders. Total: ${allOrders.length}`
//           );
//         }

//         // check if there's a next page
//         hasNextPage = data.pagination?.hasNextPage === true;
//         currentUrl = data.pagination?.nextPageUrl;

//         pageCount++;

//         // small delay to be respectful to the API
//         if (hasNextPage) {
//           await new Promise((resolve) => setTimeout(resolve, 100));
//         }
//       }

//       if (pageCount >= maxPages) {
//         console.warn(
//           `Stopped after ${maxPages} pages to prevent infinite loop`
//         );
//       }

//       console.log(
//         `Collected ${allOrders.length} total orders across ${pageCount} pages`
//       );
//       return allOrders;
//     } catch (error) {
//       console.error("Error fetching all orders:", error);
//       throw error;
//     }
//   }


//   const squarespace_orders: any = await getAllSquarespaceOrders(
//     date_in_ob.toISOString(),
//     date_out_ob.toISOString()
//   );

//   // loop through line items, see if they match sf_id, and if yes add totals

//   const matchingItems: any = [];

//   const sf_ID = ["6838925385C3C", "683892920536D"];

//   // squarespace_orders.forEach((order: any) => {
//   //   if (order.lineItems && Array.isArray(order.lineItems)) {
//   //     order.lineItems.forEach((item: any) => {
//   //       // Check if SKU contains the partial string (case-insensitive)
//   //       if (
//   //         item.sku.includes(sf_ID[0]) ||
//   //         item.sku.includes(sf_ID[1]) ||
//   //         item.sku.includes(sf_ID[2])
//   //       ) {
//   //         matchingItems.push({
//   //           ...item,
//   //           orderNumber: order.orderNumber,
//   //           orderId: order.id,
//   //           customerEmail: order.customerEmail,
//   //         });
//   //       }
//   //     });
//   //   }
//   // });

//   const totalAmount = matchingItems.reduce((total: any, item: any) => {
//     // parse the unit price and multiply by quantity
//     const unitPrice = parseFloat(item.unitPricePaid.value);
//     const quantity = item.quantity || 1;
//     const itemTotal = unitPrice * quantity;

//     const shipping = 5;

//     // TODO: make this a variable dependant on the item ordered
//     const shirt_cost = 20;

//     return total + itemTotal + shipping - shirt_cost;
//   }, 0);

//   console.log("totalAmount", totalAmount);

//   console.log(date_in, date_out);
