import { NextApiRequest, NextApiResponse } from "next";
import pino from 'pino';
import * as dbHelp from "../../server/db";
import { ListenMeta } from "postgres";
import cal_zip from "../../data/CA_ZIP.json";

const logger = pino();

// Define interfaces for better type safety
interface PrintfulOrderItem {
  sku: string;
  name: string;
  quantity: number;
  retail_price: number;
  price: number;
}

interface PrintfulOrder {
  id: string;
  external_id: string;
  created: number;
  recipient: {
    zip: string;
  };
  pricing_breakdown: Array<{
    customer_pays: number;
    printful_price: number;
    profit: number;
  }>;
  items: PrintfulOrderItem[];
  costs: {
    shipping: number;
    tax: number;
    discount: number;
  };
}

interface StripeCharge {
  id: string;
  created: number;
  amount_captured: number;
  description: string;
  billing_details?: {
    address?: {
      postal_code?: string;
    };
  };
  metadata: {
    orderId?: string;
  };
}

interface MemberChargeData {
  date: string;
  amount: number;
  stripe_fee: number;
  description: string;
  zip: string;
  chapter: string;
}

interface MemberArray {
  SF: MemberChargeData[];
  LA: MemberChargeData[];
  NA: MemberChargeData[];
}

interface MerchOrderItem {
  item: string;
  quantity: number;
}

interface MerchBody {
  date: string;
  id: number;
  customer_spend: number;
  printful_price: number;
  total_profit: number;
  sf_profits: number;
  order: MerchOrderItem[];
  zip: number;
}

interface PrintfulApiOptions {
  offset?: number;
  limit?: number;
  status?: string;
}

interface PrintfulApiResponse {
  result: PrintfulOrder[];
}

interface StripeChargeParams {
  limit: number;
  "created[lt]": number;
  "created[gte]": number;
  starting_after?: string;
}

interface StripeChargeResponse {
  data: StripeCharge[];
  has_more: boolean;
}

interface ZipToChapterMap {
  [key: string]: string;
}

interface CalZipFeature {
  properties: {
    ZIP_CODE: string;
    CHAPTER: string;
  };
}

interface CalZipData {
  features: CalZipFeature[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  const PRINTFUL_KEY = process.env.PRINTFUL_API_KEY;

  // Extract dates from request body or query parameters
  const { date_in: dateInParam, date_out: dateOutParam } = req.method === 'POST' ? req.body : req.query;

  // Validate that dates are provided
  if (!dateInParam || !dateOutParam) {
    return res.status(400).json({ 
      error: 'Missing required parameters: date_in and date_out are required' 
    });
  }

  // Parse and validate dates
  const date_in_ob = new Date(dateInParam as string);
  const date_out_ob = new Date(dateOutParam as string);

  // Validate that dates are valid
  if (isNaN(date_in_ob.getTime()) || isNaN(date_out_ob.getTime())) {
    return res.status(400).json({ 
      error: 'Invalid date format. Please use YYYY-MM-DD format' 
    });
  }

  // Validate that start date is before end date
  if (date_in_ob > date_out_ob) {
    return res.status(400).json({ 
      error: 'Start date must be before end date' 
    });
  }

  logger.info(`Processing orders from ${date_in_ob.toISOString()} to ${date_out_ob.toISOString()}`);

  const date_in = Math.floor(date_in_ob.getTime() / 1000);
  const date_out = Math.floor(date_out_ob.getTime() / 1000);

  async function getPrintfulOrders(options: PrintfulApiOptions = {}): Promise<PrintfulApiResponse> {
    const baseUrl = "https://api.printful.com";
    const endpoint = "/orders";
    
    // Build query parameters from options
    const params = new URLSearchParams();
    
    // Add pagination parameters
    if (options.offset) {
      params.append('offset', options.offset.toString());
    }
    if (options.limit) {
      params.append('limit', options.limit.toString());
    }
    
    // Add other potential parameters
    if (options.status) {
      params.append('status', options.status);
    }
    
    const url = `${baseUrl}${endpoint}${
      params.toString() ? "?" + params.toString() : ""
    }`;
    
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${PRINTFUL_KEY}`,
          "Content-Type": "application/json",
          "X-PF-Store-Id": "", // Add store ID if using multiple stores
        },
      });
      
      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} - ${response.statusText}`
        );
      }
      
      const data: PrintfulApiResponse = await response.json();
      return data;
    } catch (error) {
      logger.error(error, "Error retrieving Printful orders:");
      throw error;
    }
  }
  
  /**
   * Collect all orders within a date range with automatic pagination
   * @param startDate - Start date 
   * @param endDate - End date
   * @returns Promise that resolves to array of all orders in date range
   */
  async function getAllOrdersByDateRange(startDate: Date, endDate: Date): Promise<PrintfulOrder[]> {
    const allOrders: PrintfulOrder[] = [];
    let offset = 0;
    let blankCount = 0;
    const limit = 100; // Maximum allowed by Printful API
    let hasMoreOrders = true;
    
    logger.info(`date ${startDate} ${endDate}`);
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("Invalid date format. Use YYYY-MM-DD or Date objects.");
    }
    
    if (startDate > endDate) {
      throw new Error("Start date must be before end date.");
    }
    
    logger.info(
      `Collecting orders from ${startDate.toDateString()} to ${endDate.toDateString()}...`
    );
    
    try {
      while (hasMoreOrders) {
        logger.info(`Fetching batch starting at offset ${offset}...`);
        
        const response = await getPrintfulOrders({
          offset: offset,
          limit: limit,
        });
        
        if (!response.result || !Array.isArray(response.result)) {
          logger.info("No more results or invalid response structure");
          break;
        }
        
        logger.info(`Retrieved ${response.result.length} orders from API`);
        
        // Filter orders by date range
        const ordersInRange = response.result.filter((order: PrintfulOrder) => {
          const orderDate = new Date(order.created * 1000);
          return orderDate >= startDate && orderDate <= endDate;
        });
        
        logger.info(`${ordersInRange.length} orders match date range`);
        allOrders.push(...ordersInRange);
        
        // Check if we have more orders to fetch
        // If we got fewer results than the limit, we've reached the end
        hasMoreOrders = response.result.length === limit;

        // This times out function if it returns 0 orders X times in a row
        if (ordersInRange.length === 0) {
          blankCount = blankCount + 1;
        }

        if (blankCount > 3) {
          hasMoreOrders = false;
        }
        
        if (hasMoreOrders) {
          offset += limit;
          logger.info(`More orders available, next offset: ${offset}`);
        } else {
          logger.info("Reached end of results");
        }
        
        // Add a small delay to be respectful to the API
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      
      logger.info(
        `Collected ${allOrders.length} orders in the specified date range.`
      );
      return allOrders;
    } catch (error) {
      logger.error(error, "Error collecting orders by date range:");
      throw error;
    }
  }

  const chargeFunction = async (dateIn: number, dateOut: number): Promise<StripeCharge[]> => {
    let allCharges: StripeCharge[] = []; // Store all accumulated charges
    let hasMore = true;
    let startingAfter: string | null = null;
    
    while (hasMore) {
      const params: StripeChargeParams = {
        limit: 100,
        "created[lt]": dateOut,
        "created[gte]": dateIn,
      };
      
      // Add pagination parameter if we have a cursor
      if (startingAfter) {
        logger.info("cursor");
        params.starting_after = startingAfter;
      }
      
      try {
        const charges: StripeChargeResponse = await stripe.charges.list(params); 
        
        // Accumulate the charges from this page
        allCharges = allCharges.concat(charges.data);
        
        // Update pagination variables
        hasMore = charges.has_more;
        if (hasMore && charges.data.length > 0) {
          logger.info("get more charges");
          startingAfter = charges.data[charges.data.length - 1].id;
        }
      } catch (error) {
        logger.error(error, "Error fetching charges:");
        throw error;
      }
    }
    
    return allCharges; // Return the accumulated charge data, not the API response object
  };
  
  const stripe_charges = await chargeFunction(date_in, date_out);

  const memberArray: MemberArray = {
    SF: [],
    LA: [],
    NA: [],
  };

  const merchArray: Array<{ merchOrder: PrintfulOrder; charge: StripeCharge }> = [];

  // Create a lookup map for better performance (do this once outside the loop)
  const zipToChapterMap: ZipToChapterMap = {};

  (cal_zip as CalZipData).features.forEach((item) => {
    if (item.properties && item.properties.ZIP_CODE) {
      zipToChapterMap[item.properties.ZIP_CODE.toString()] =
        item.properties.CHAPTER;
    }
  });

  const printfulOrders = await getAllOrdersByDateRange(date_in_ob, date_out_ob);

  const sf_merch_body: MerchBody[] = [];
  const all_merch_body: MerchBody[] = [];

  // SORT ORDERS
  stripe_charges.forEach((charge: StripeCharge) => {
    const date = new Date(charge.created * 1000);

    if (charge.description === "Subscription update" || charge.description === "Subscription creation") {
      //
      //
      // these are membership subscriptions
      //
      //
      const zip = charge.billing_details?.address?.postal_code;
      if (zip) {
        // Clean up zip code (remove any extra characters, keep only first 5 digits)
        const cleanZip = zip.toString().slice(0, 5);

        // Look up the chapter for this zip code
        const chapter = zipToChapterMap[cleanZip];

        const member_payment = charge.amount_captured / 100;
        const stripe_fee = (member_payment * 0.029) + 0.3;

        const memberChargeData: MemberChargeData = {
          date: date.toDateString(),
          amount: member_payment - stripe_fee,
          stripe_fee: stripe_fee,
          description: charge.description,
          zip: cleanZip,
          chapter: chapter || "NA",
        };

        // Add to appropriate array
        if (chapter && memberArray[chapter as keyof MemberArray]) {
          memberArray[chapter as keyof MemberArray].push(memberChargeData);
        } else {
          memberArray.NA.push(memberChargeData);
        }
      }
    } else {
      //
      //
      // these are merch orders
      //
      //

      function findOrder(order: PrintfulOrder): boolean {
        return order.external_id === charge.metadata.orderId;
      }

      const merchOrder = printfulOrders.find((order) => findOrder(order));

      if (merchOrder) {
        merchArray.push({ merchOrder, charge });

        const sf_ID = ["6838925385C3C", "683892920536D"];

        // need to calculate how many of these are SF Merch
        const merch_body: MerchBody = {
          date: date.toDateString(),
          id: Number(merchOrder.external_id),
          customer_spend: Number(merchOrder.pricing_breakdown[0]?.customer_pays || 0),
          printful_price: Number(merchOrder.pricing_breakdown[0]?.printful_price || 0),
          total_profit: Number(merchOrder.pricing_breakdown[0]?.profit || 0),
          sf_profits: 0,
          order: [],
          zip: Number(merchOrder.recipient.zip),
        };

        const sf_merch_costs = { retail: [] as number[], price: [] as number[] };
        const merch_margin: number[] = [];

        merchOrder.items?.forEach((item: PrintfulOrderItem) => {
          merch_body.order.push({ item: item.name, quantity: item.quantity });

          merch_margin.push(Number(item.retail_price * item.quantity) - Number(item.price * item.quantity));

          // Check if SKU contains the partial string (case-insensitive)
          if (
            item.sku.includes(sf_ID[0]) ||
            item.sku.includes(sf_ID[1])
          ) {
            // customer cost per item
            sf_merch_costs.retail.push(Number(item.retail_price * item.quantity));

            // printful price per item before discount
            sf_merch_costs.price.push(Number(item.price) * item.quantity);
          }
        });

        if (sf_merch_costs.price.length > 0) {
          const sf_ratio = sf_merch_costs.retail.length / (merchOrder.items?.length || 1);

          const total_sf_customer = sf_merch_costs.retail.reduce((a: number, b: number) => a + b, 0);
          const total_sf_printful = sf_merch_costs.price.reduce((a: number, b: number) => a + b, 0);

          // extra fees = fees paid by customer added by squarespace but not included per item (i.e tax) - this is additional revenue for us
          // shared costs = net fees charged by printful (shipping + tax - discount) 
          // stripe fee = fee charged by stripe (.29% + $00.30) per transaction
          // sf_share = (shared_costs - extra_fees + stripe_fee) * ratio of San Francisco items per order;

          // sf_profits = sf_merch_items_retail - sf_merch_items_printful_costs - sf_share

          // this finds the total extra fees charged to the customer not captured when itemized 
          // this is calculated for ALL merch (not just SF)
          const merch_marg = merch_margin.reduce((a: number, b: number) => a + b, 0);
          const net_margin = Number(merchOrder.pricing_breakdown[0]?.customer_pays || 0) - Number(merchOrder.pricing_breakdown[0]?.printful_price || 0);
          const extra_fees = net_margin - merch_marg;

          // these are all shared costs for shipping and fees
          const shared_costs = Number(merchOrder.costs.shipping) + Number(merchOrder.costs.tax) - Number(merchOrder.costs.discount);

          // stripe fee
          const stripe_fee = ((merchOrder.pricing_breakdown[0]?.customer_pays || 0) * 0.029) + 0.3;

          // this is the approximation for how much of the extra fees for both customers and us are from SF merch
          const sf_share = (shared_costs - extra_fees + stripe_fee) * sf_ratio;

          // sf profit is the profit for all items, with SF's share of fees subtracted
          merch_body.sf_profits = total_sf_customer - total_sf_printful - sf_share;

          logger.info({
            'shared_costs (-)': shared_costs,
            "stripe_fee": stripe_fee,
            "shared_fee_income (+)": extra_fees,
            "sf_ratio": sf_ratio,
            "sf_share": sf_share,
            "net_margin": net_margin,
            "merch_marg": merch_marg,
            "total_sf_customer": total_sf_customer,
            "total_sf_printful": total_sf_printful,
            "total_sf_margin_raw": total_sf_customer - total_sf_printful
          });

          logger.info(merch_body);
        }

        all_merch_body.push(merch_body);
      }
    }
  });

  try {
    res.status(200).json({ memberArray, all_merch_body });
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error(`An error occurred counting members: ${error.message}`);
    }

    res.status(500).send("An error occurred counting members");
  }
}