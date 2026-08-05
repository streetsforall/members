'use server';

import { generateIdFromEntropySize } from 'lucia';
import { TimeSpan, createDate } from 'oslo';
import pino, { type Logger } from 'pino';
import postgres from 'postgres';

// Used for any loggers not passed as arguments
const defaultLogger = pino();

const sql = postgres('', {
  host: process.env.DO_HOST,
  port: process.env.DO_PORT as unknown as number,
  database: process.env.DO_DB,
  username: process.env.DO_USERNAME,
  password: process.env.DO_PASSWORD,
  ssl: process.env.MODE === 'development' ? false : 'require'!,
});

/**
 * Get members in Tiers 1-3
 * @returns Member record
 */
async function getValidMembers() {
  try {
    const users = await sql`
      SELECT
        name,
        email,
        last_amount,
        tier,
        branch,
        shipping_address,
        phone
      FROM members
      WHERE tier > 0 AND tier < 4;
    `;

    return users;
  } catch (error) {
    defaultLogger.error(error);

    return;
  }
}

/**
 * Get member based on id
 * @param id - Id of member in the database
 * @returns Member record
 */
async function getMemberById(id: string) {
  try {
    const user = await sql`
      SELECT
        name,
        email,
        id,
        last_amount,
        last_donation,
        tier,
        customer_id,
        joined_date,
        subscription_id
      FROM members
      WHERE id = ${id};
    `;

    return user[0];
  } catch (error) {
    defaultLogger.error(error);

    return;
  }
}

/**
 * Get member based on email
 * @param email - Email of member
 * @returns Member record
 */
async function getMemberByEmail(email: string) {
  try {
    const user = await sql`
      SELECT
        name,
        email,
        id,
        last_amount,
        last_donation,
        tier,
        shipping_address,
        customer_id,
        joined_date,
        shirt_size,
        subscription_id
      FROM members
      WHERE UPPER(email) LIKE UPPER(${email});
    `;

    return user[0];
  } catch (error) {
    defaultLogger.error(error);

    return;
  }
}

/**
 * Get member based on customer id
 * @param customerId - Stripe customer id of member
 * @returns Member record
 */
async function getMemberByCustomerId(customerId: string) {
  try {
    const member = await sql`
      SELECT
        name,
        email,
        id,
        last_amount,
        last_donation,
        tier,
        shipping_address,
        customer_id,
        joined_date,
        shirt_size,
        subscription_id
      FROM members
      WHERE customer_id = ${customerId};
    `;

    return member[0];
  } catch (error) {
    defaultLogger.error(error);

    return;
  }
}

/**
 * Update member email verification status in database
 * @param data - Information about the member
 * @param logger - Instance used for logging
 * @returns
 */
async function updateMemberEmailVerification(
  data: { id: number; isEmailVerified: boolean },
  logger: Logger = defaultLogger,
) {
  const childLogger = logger.child({
    step: 'update_member_email_verification',
  });

  const { id, isEmailVerified } = data;

  try {
    await sql`
      UPDATE members
      SET email_verified = ${isEmailVerified}
      WHERE id = ${id};
    `;

    childLogger.debug(
      `Set member ${id} email verification status to ${isEmailVerified}`,
    );
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Get merch orders in db by email
 * @param email - Email associated with the order in the database
 * @returns All matching order records
 */
async function getOrders(email: string) {
  try {
    const orders = await sql`
      SELECT
        order_id,
        email,
        order_tier,
        shirt_size,
        delivery_status,
        order_status,
        order_package
      FROM merch_orders
      WHERE email=${email}
      ORDER BY date DESC 
    `;

    return orders;
  } catch (error) {
    defaultLogger.error(error);

    return;
  }
}

/**
 * Add merch order to db
 * @param data - Information about the order
 * @param logger - Instance used for logging
 * @returns
 */
async function addOrder(
  data: {
    email: string;
    tier: number;
    date: string;
    orderId: number;
    isDelivered: boolean;
    shirtSize: string;
    orderPackage: string;
    status: string;
  },
  logger: Logger = defaultLogger,
) {
  const childLogger = logger.child({ step: 'add_order' });

  const {
    email,
    tier,
    date,
    orderId,
    isDelivered,
    shirtSize,
    orderPackage,
    status,
  } = data;

  try {
    await sql`
      INSERT INTO merch_orders (email, order_tier, date, order_id, delivered, shirt_size, order_package, order_status)
      VALUES(${email}, ${tier}, ${date}, ${orderId}, ${isDelivered}, ${shirtSize} , ${orderPackage}, ${status})
    `;

    childLogger.info(
      { order_id: orderId, tier, status },
      'Added order to database',
    );

    return;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Update merch order status in database
 * @param data - Information about the order
 * @param logger - Instance used for logging
 * @returns
 */
async function updateOrderStatus(
  data: {
    orderId: number;
    status: string;
    deliveryStatus: string;
  },
  logger: Logger = defaultLogger,
) {
  const childLogger = logger.child({ step: 'update_order_status' });

  const { orderId, status, deliveryStatus } = data;

  try {
    await sql`
      UPDATE merch_orders set order_status = ${status}, delivery_status = ${deliveryStatus} WHERE order_id = ${orderId}
    `;

    childLogger.info(
      {
        order_id: orderId,
        status,
      },
      'Updated order status in database',
    );

    return;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Generate unique session token
 * @param data.email - Email to be associated with the session
 * @param logger - Instance used for logging
 * @returns Generated token
 */
async function setSessionToken(
  data: { email: string },
  logger: Logger = defaultLogger,
) {
  const childLogger = logger.child({ step: 'set_session_token' });

  const { email } = data;

  const date = new Date().toLocaleString('en-US');

  // 40 characters long
  const tokenId = generateIdFromEntropySize(25);

  // Valid for 1 day
  const expiration = createDate(new TimeSpan(1, 'd'));

  try {
    await sql`
    INSERT INTO email_verification_token (id, user_id, email, expires_at, created)
      VALUES( ${tokenId}, ${email}, ${email}, ${expiration}, ${date})
  `;
    childLogger.debug(`New login token for ${email}`);

    return tokenId;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Retrieve session token from database
 * @param data - Information about the token
 * @param logger - Instance used for logging
 * @returns Token
 */
async function getSessionToken(
  data: { id: string },
  logger: Logger = defaultLogger,
) {
  const childLogger = logger.child({ step: 'get_session_token' });

  const { id } = data;

  try {
    const token = await sql`
      SELECT * FROM email_verification_token
      WHERE id = ${id}
    `;

    if (token.length) {
      childLogger.debug('Retrieved session token');

      return token[0];
    } else {
      childLogger.debug('Session token not found');

      return null;
    }
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Update member to be canceled
 * @param canceledMember - Member subscription information
 * @param logger - Instance used for logging
 */
async function cancelMember(
  canceledMember: {
    tier: number;
    email: string;
    status: string;
    amount: number;
  },
  logger: Logger,
) {
  const childLogger = logger.child({ step: 'update_member' });

  try {
    const date = new Date().toLocaleString('en-US');

    await sql`
    UPDATE members SET tier = ${canceledMember.tier}, last_amount = ${canceledMember.amount}, last_donation = ${date} WHERE email = ${canceledMember.email};
    `;
    childLogger.info(
      {
        amount: canceledMember.amount,
        status: canceledMember.status,
        tier: canceledMember.tier,
      },
      'Updated member in database',
    );

    // TODO: Catch when member not found in DB

    return;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Record actions and updates
 * @param memberUpdate - Information about the update
 * @param logger - Instance used for logging
 * @returns
 */
async function setMemberUpdate(
  memberUpdate: {
    email: string;
    newTier: number;
    update: string;
  },
  logger: Logger,
) {
  // Add update to database
  let childLogger = logger.child({ step: 'record_update' });

  try {
    const date = new Date().toLocaleString('en-US');

    await sql`
      INSERT INTO member_updates (email, date, newtier, update)
      VALUES(${memberUpdate.email}, ${date}, ${memberUpdate.newTier}, ${memberUpdate.update})
    `;
    childLogger.info('Added update to database');
  } catch (error) {
    childLogger.error(error);

    // Stop subsequent step if this one fails
    return;
  }

  // Call Zapier to post update
  childLogger = logger.child({ step: 'post_update' });
  try {
    const zapURL: string = process.env.MEMBER_ZAP!;

    const response = await fetch(zapURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberUpdate),
    });

    if (response.ok) {
      childLogger.info('Update sent to Zapier');

      return;
    } else {
      const message = (await response.json()).error.message;

      throw new Error(message);
    }
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Add shirt size to member
 * @param memberObj - Member email and size
 * @param logger - Instance used for logging
 * @returns
 */
async function setMemberShirt(
  memberObj: {
    email: string;
    size: string;
  },
  logger: Logger,
) {
  const childLogger = logger.child({ step: 'update_shirt_size' });

  try {
    await sql`
      INSERT INTO members (email, shirt_size)
        VALUES(${memberObj.email}, ${memberObj.size})
        ON CONFLICT (email) 
	      DO UPDATE SET email = ${memberObj.email}, shirt_size = ${memberObj.size}
    `;
    childLogger.info(
      { size: memberObj.size },
      'Updated shirt size in database',
    );

    return;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Create new member
 * @param member - Member information
 * @param logger - Instance used for logging
 * @returns
 */
async function addMember(
  member: {
    tier?: number;
    name: string;
    phone: string;
    email: string;
    address: string;
    amount?: number;
    customerId: string;
    subscriptionId?: string;
    chapter: 'CA' | 'LA' | 'SF';
  },
  logger: Logger = defaultLogger,
) {
  const childLogger = logger.child({ step: 'add_member' });

  const {
    tier = 0,
    name,
    phone,
    email,
    address,
    amount = null,
    customerId,
    subscriptionId = null,
    chapter,
  } = member;

  try {
    const date = new Date().toLocaleString('en-US');

    await sql`
      INSERT INTO members (name, email, joined_date, tier, last_amount, shipping_address, last_donation, customer_id, phone, subscription_ID, branch)
        VALUES(${name}, ${email}, ${date}, ${tier}, ${amount}, ${address}, ${date}, ${customerId}, ${phone}, ${subscriptionId}, ${chapter})
        ON CONFLICT (email)
          DO UPDATE SET name = ${name}, joined_date = ${date}, tier = ${tier}, last_amount = ${amount}, shipping_address = ${address}, last_donation = ${date}, customer_id = ${customerId}, phone = ${phone}, subscription_id = ${subscriptionId}, branch = ${chapter}
    `;
    childLogger.info(
      {
        amount,
        chapter,
        subscription_id: subscriptionId,
        tier,
      },
      'Added member to database',
    );

    return;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Update subscription information for member
 * @param data - Member subscription information
 * @param logger - Instance used for logging
 * @returns
 */
async function updateMemberSubscription(
  data: {
    customerId: string;
    subscriptionId: string;
    address: string;
    amount: number;
    tier: number;
  },
  logger: Logger = defaultLogger,
) {
  const childLogger = logger.child({ step: 'update_member_subscription' });

  const { customerId, subscriptionId, address, amount, tier } = data;

  try {
    const date = new Date().toLocaleString('en-US');

    await sql`
      UPDATE members set subscription_ID = ${subscriptionId}, last_amount = ${amount}, shipping_address = ${address}, last_donation = ${date}, tier = ${tier} WHERE customer_id = ${customerId}
    `;
    childLogger.info(
      {
        subscription_id: subscriptionId,
        amount,
        tier,
      },
      'Updated member subscription information',
    );

    return;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Record email attempts in db
 * @param data - Information about the email
 * @param logger - Instance used for logging
 * @returns
 */
async function recordEmail(
  data: {
    date: string;
    type: 'login request' | 'welcome email';
    email: string;
    isSuccessful: boolean;
  },
  logger: Logger = defaultLogger,
) {
  const childLogger = logger.child({ step: 'record_email' });

  const { date, type, email, isSuccessful } = data;

  try {
    await sql`
      INSERT INTO emails ( date, type, email_address, success)
      VALUES( ${date}, ${type}, ${email}, ${isSuccessful})
    `;

    childLogger.debug('Recorded email in database');

    return;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Retrieve most recently activated Peak Design promo code
 * @param email - Member email
 * @returns Promo code
 */
async function getCurrentPeakCode(email: string) {
  const childLogger = defaultLogger.child({ step: 'get_current_peak_code' });

  try {
    const activatedCodes = await sql`
      SELECT
        code,
        date_used
      FROM peak_discounts
      WHERE email=${email}
      ORDER BY date_used DESC 
    `;

    const activeCode = activatedCodes[0];
    childLogger.info({ code: activeCode.code }, 'Retrieved current promo code');

    return activeCode;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Activate next available Peak Design promo code
 * @param email - Member email
 * @returns Promo code
 */
async function getNextPeakCode(email: string) {
  const childLogger = defaultLogger.child({ step: 'activate_peak_code' });

  try {
    const newCodes = await sql`
      SELECT
        code
      FROM peak_discounts
      WHERE email IS NULL
      ORDER BY date_used DESC 
    `;

    const newCode = newCodes[0].code;
    const updated = new Date().toLocaleString('en-US');

    await sql`
      INSERT INTO peak_discounts (code, email, date_used)
      VALUES(${newCode}, ${email}, ${updated})
      ON CONFLICT (code) 
      DO UPDATE SET email = ${email}, date_used = ${updated}
    `;
    childLogger.info({ code: newCode }, 'Activated new code');

    return newCode;
  } catch (error) {
    childLogger.error(error, 'No more codes');

    return 'No more codes';
  }
}

export {
  sql,
  getValidMembers,
  getMemberById,
  getMemberByEmail,
  getMemberByCustomerId,
  updateMemberEmailVerification,
  getOrders,
  addOrder,
  updateOrderStatus,
  setSessionToken,
  getSessionToken,
  cancelMember,
  setMemberUpdate,
  setMemberShirt,
  addMember,
  updateMemberSubscription,
  recordEmail,
  getCurrentPeakCode,
  getNextPeakCode,
};
