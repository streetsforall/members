import { NextApiRequest, NextApiResponse } from 'next';
import pino, { type Logger } from 'pino';
import Stripe from 'stripe';
import calZip from '../../data/CA_ZIP.json';

const parentLogger = pino();

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
  description: string | null;
  billing_details?: {
    address: {
      postal_code: string | null;
    } | null;
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
  'created[lt]': number;
  'created[gte]': number;
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

/**
 * Retreive orders from Printful
 * @param options - Pagination and status parameters
 * @returns Printful orders
 */
async function getPrintfulOrders(
  options: PrintfulApiOptions = {},
  logger: Logger,
): Promise<PrintfulApiResponse> {
  const childLogger = logger.child({ step: 'get_printful_orders' });

  const PRINTFUL_KEY = process.env.PRINTFUL_KEY;

  const baseUrl = 'https://api.printful.com';
  const endpoint = '/orders';

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
    params.toString() ? '?' + params.toString() : ''
  }`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PRINTFUL_KEY}`,
        'Content-Type': 'application/json',
        'X-PF-Store-Id': '', // Add store ID if using multiple stores
      },
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} - ${response.statusText}`,
      );
    }

    const data: PrintfulApiResponse = await response.json();

    childLogger.debug(`Retrieved ${data.result.length} orders`);

    return data;
  } catch (error) {
    childLogger.error(error);

    throw new Error(error);
  }
}

/**
 * Collect all orders within a date range with automatic pagination
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Promise that resolves to array of all orders in date range
 */
async function getAllOrdersByDateRange(
  startDate: Date,
  endDate: Date,
  logger: Logger,
): Promise<PrintfulOrder[]> {
  const childLogger = logger.child({ step: 'get_all_orders_by_date_range' });

  const allOrders: PrintfulOrder[] = [];
  let offset = 0;
  let blankCount = 0;
  const limit = 100; // Maximum allowed by Printful API
  let hasMoreOrders = true;

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD or Date objects.');
  }

  // Validate that start date is before end date
  if (startDate > endDate) {
    throw new Error('Start date must be before end date.');
  }

  try {
    while (hasMoreOrders) {
      childLogger.debug(`Fetching batch starting at offset ${offset}...`);

      const response = await getPrintfulOrders(
        {
          offset: offset,
          limit: limit,
        },
        childLogger,
      );

      if (!response.result || !Array.isArray(response.result)) {
        childLogger.info('No more results or invalid response structure');

        break;
      }

      // Filter orders by date range
      const ordersInRange = response.result.filter((order: PrintfulOrder) => {
        const orderDate = new Date(order.created * 1000);

        return orderDate >= startDate && orderDate <= endDate;
      });
      allOrders.push(...ordersInRange);

      childLogger.debug(`${ordersInRange.length} orders match date range`);

      // Check if we have more orders to fetch
      // If fewer results than limit, reached the end
      hasMoreOrders = response.result.length === limit;

      // Times out function if it returns 0 orders X times in a row
      if (ordersInRange.length === 0) {
        blankCount = blankCount + 1;
      }
      if (blankCount > 3) {
        hasMoreOrders = false;
      }

      if (hasMoreOrders) {
        offset += limit;

        childLogger.debug(`More orders available, next offset: ${offset}`);
      } else {
        childLogger.debug('Reached end of results');
      }

      // Add a small delay to be respectful to the API
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    childLogger.info(
      `Collected ${allOrders.length} orders in the specified date range`,
    );

    return allOrders;
  } catch (error) {
    childLogger.error(error);

    throw new Error(error);
  }
}

/**
 * Retrive charges from Stripe
 * @param dateStart - Start date (inclusive)
 * @param dateEnd - End date (exclusive)
 * @param logger - Instance used for logging
 * @returns Stripe charges on or after the start date and before the end date
 */
async function getStripeCharges(
  dateStart: Date,
  dateEnd: Date,
  logger: Logger,
): Promise<StripeCharge[]> {
  const childLogger = logger.child({ step: 'get_stripe_charges' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

  const dateStartNum = Math.floor(dateStart.getTime() / 1000);
  const dateEndNum = Math.floor(dateEnd.getTime() / 1000);

  let allCharges: StripeCharge[] = []; // Store all accumulated charges
  let hasMore = true;

  const params: StripeChargeParams = {
    limit: 100,
    'created[gte]': dateStartNum,
    'created[lt]': dateEndNum,
  };

  while (hasMore) {
    try {
      const charges: StripeChargeResponse = await stripe.charges.list(params);

      // Accumulate the charges from this page
      allCharges = allCharges.concat(charges.data);

      // Update pagination variables
      hasMore = charges.has_more;
      if (hasMore && charges.data.length > 0) {
        childLogger.debug('More charges');

        params.starting_after = charges.data[charges.data.length - 1].id;
      }
    } catch (error) {
      childLogger.error(error);

      throw new Error(error);
    }
  }

  childLogger.info(
    `Collected ${allCharges.length} charges in the specified date range`,
  );

  return allCharges;
}

/**
 * Main request handler
 * @param req - Request object
 * @param res - Response object
 * @returns
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Extract dates from request body or query parameters
  const { date_in: dateStartParam, date_out: dateEndParam } =
    req.method === 'POST' ? req.body : req.query;

  // Validate that dates are provided
  if (!dateStartParam || !dateEndParam) {
    return res.status(400).json({
      error: 'Missing required parameters: date_in and date_out are required',
    });
  }

  // Parse and validate dates
  const dateStart = new Date(dateStartParam as string);
  const dateEnd = new Date(dateEndParam as string);

  // Validate that dates are valid
  if (isNaN(dateStart.getTime()) || isNaN(dateEnd.getTime())) {
    return res.status(400).json({
      error: 'Invalid date format. Please use YYYY-MM-DD format',
    });
  }

  // Validate that start date is before end date
  if (dateStart > dateEnd) {
    return res.status(400).json({
      error: 'Start date must be before end date',
    });
  }

  // Create logger instance for request
  const logger = parentLogger.child({
    request_type: 'charge_server',
    dateStart,
    dateEnd,
  });

  logger.info({ step: 'incoming_request' }, 'Incoming request');

  // Create a chapter lookup map for better performance (do this once outside the loop)
  const zipToChapterMap: ZipToChapterMap = {};

  (calZip as CalZipData).features.forEach((item) => {
    if (item.properties && item.properties.ZIP_CODE) {
      zipToChapterMap[item.properties.ZIP_CODE.toString()] =
        item.properties.CHAPTER;
    }
  });

  const memberArray: MemberArray = {
    SF: [],
    LA: [],
    NA: [],
  };
  const merchArray: Array<{ merchOrder: PrintfulOrder; charge: StripeCharge }> =
    [];
  const allMerchBody: MerchBody[] = [];

  const stripeCharges = await getStripeCharges(dateStart, dateEnd, logger);
  const printfulOrders = await getAllOrdersByDateRange(
    dateStart,
    dateEnd,
    logger,
  );

  // Sort charges
  stripeCharges.forEach((charge: StripeCharge) => {
    const date = new Date(charge.created * 1000);

    if (
      charge.description === 'Subscription update' ||
      charge.description === 'Subscription creation'
    ) {
      /**
       * Membership subscriptions
       */

      const zip = charge.billing_details?.address?.postal_code;

      if (zip) {
        // Clean up zip code (remove any extra characters, keep only first 5 digits)
        const cleanZip = zip.toString().slice(0, 5);

        // Look up chapter for zip
        const chapter = zipToChapterMap[cleanZip];

        const memberPayment = charge.amount_captured / 100;

        // 2.9% + $0.30 Stripe fee
        const stripeFee = memberPayment * 0.029 + 0.3;

        // TODO: Camelcase; need to update client-side as well
        const memberChargeData: MemberChargeData = {
          date: date.toDateString(),
          amount: memberPayment - stripeFee,
          stripe_fee: stripeFee,
          description: charge.description,
          zip: cleanZip,
          chapter: chapter || 'NA',
        };

        // Add to appropriate chapter array
        if (chapter && memberArray[chapter as keyof MemberArray]) {
          memberArray[chapter as keyof MemberArray].push(memberChargeData);
        } else {
          memberArray.NA.push(memberChargeData);
        }
      }
    } else {
      /**
       * Merch orders
       */

      // Get Printful order associated with Stripe charge
      const merchOrder = printfulOrders.find(
        (order) => order.external_id === charge.metadata.orderId,
      );

      if (merchOrder) {
        // TODO: Is this needed?
        merchArray.push({ merchOrder, charge });

        // TODO: Make merch SKUs dynamic/configuratble
        const sfSkus = ['6838925385C3C', '683892920536D'];

        // need to calculate how many of these are SF Merch
        const merchBody: MerchBody = {
          date: date.toDateString(),
          id: Number(merchOrder.external_id),
          customer_spend: Number(
            merchOrder.pricing_breakdown[0]?.customer_pays || 0,
          ),
          printful_price: Number(
            merchOrder.pricing_breakdown[0]?.printful_price || 0,
          ),
          total_profit: Number(merchOrder.pricing_breakdown[0]?.profit || 0),
          sf_profits: 0,
          order: [],
          zip: Number(merchOrder.recipient.zip),
        };

        const sfMerchCosts = {
          retail: [] as number[],
          price: [] as number[],
        };
        const merchItemMargins: number[] = [];

        const order: MerchOrderItem[] = [];

        merchOrder.items?.forEach((item: PrintfulOrderItem) => {
          order.push({ item: item.name, quantity: item.quantity });

          // Item-level margin
          merchItemMargins.push(
            Number(item.retail_price * item.quantity) -
              Number(item.price * item.quantity),
          );

          // Check if SKU contains the partial string (case-insensitive)
          if (item.sku.includes(sfSkus[0]) || item.sku.includes(sfSkus[1])) {
            // Customer cost per item
            sfMerchCosts.retail.push(Number(item.retail_price * item.quantity));

            // Printful price per item before discount
            sfMerchCosts.price.push(Number(item.price) * item.quantity);
          }
        });

        merchBody.order = order;

        if (sfMerchCosts.price.length > 0) {
          logger.debug('Order includes SF merch');

          // Ratio of SF items in order
          const sfRatio =
            sfMerchCosts.retail.length / (merchOrder.items?.length || 1);

          // Aggregate items in order
          const totalSfRetailPrice = sfMerchCosts.retail.reduce(
            (a: number, b: number) => a + b,
            0,
          );
          const totalSfPrintfulCost = sfMerchCosts.price.reduce(
            (a: number, b: number) => a + b,
            0,
          );

          // extra fees = fees paid by customer added by squarespace but not included per item (i.e tax) - this is additional revenue for us
          // shared costs = net fees charged by printful (shipping + tax - discount)
          // Stripe fee = fee charged by stripe (2.9% + $0.30) per transaction
          // sfShare = (sharedCosts - extraFees + stripeFee) * ratio of San Francisco items per order;

          // sf_profits = sf_merch_items_retail - sf_merch_items_printful_costs - sfShare

          /**
           * Find total extra fees charged to the customer not captured when itemized
           * Calculated for ALL merch (not just SF)
           */

          // Aggregate item-level margins
          const merchAggItemMargin = merchItemMargins.reduce(
            (a: number, b: number) => a + b,
            0,
          );

          // Calculate order-level margin
          const netOrderMargin =
            Number(merchOrder.pricing_breakdown[0]?.customer_pays || 0) -
            Number(merchOrder.pricing_breakdown[0]?.printful_price || 0);

          // Get the difference
          const extraFees = netOrderMargin - merchAggItemMargin;

          // these are all shared costs for shipping and fees
          const sharedCosts =
            Number(merchOrder.costs.shipping) +
            Number(merchOrder.costs.tax) -
            Number(merchOrder.costs.discount);

          // stripe fee
          const stripeFee =
            (merchOrder.pricing_breakdown[0]?.customer_pays || 0) * 0.029 + 0.3;

          // this is the approximation for how much of the extra fees for both customers and us are from SF merch
          const sfShare = (sharedCosts - extraFees + stripeFee) * sfRatio;

          // sf profit is the profit for all items, with SF's share of fees subtracted
          merchBody.sf_profits =
            totalSfRetailPrice - totalSfPrintfulCost - sfShare;

          logger.info({
            'shared_costs (-)': sharedCosts,
            stripe_fee: stripeFee,
            'shared_fee_income (+)': extraFees,
            sf_ratio: sfRatio,
            sf_share: sfShare,
            net_margin: netOrderMargin,
            merch_marg: merchAggItemMargin,
            total_sf_customer: totalSfRetailPrice,
            total_sf_printful: totalSfPrintfulCost,
            total_sf_margin_raw: totalSfRetailPrice - totalSfPrintfulCost,
          });

          logger.info(merchBody);
        }

        allMerchBody.push(merchBody);
      }
    }
  });

  res.status(200).json({ memberArray, all_merch_body: allMerchBody });
}
