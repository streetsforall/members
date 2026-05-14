'use server';

import { cookies } from 'next/headers';
import { generateIdFromEntropySize } from 'lucia';
import { TimeSpan, createDate } from 'oslo';
import pino, { type Logger } from 'pino';
import * as auth from './auth';
import sql from './db';

// Used for any loggers not passed as arguments
const parentLogger = pino();

/**
 * Get members in Tiers 1-3
 * @returns Member record
 */
export async function retrieveValidMembers() {
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
}

/**
 * Get member based on ID
 * @param id - ID of member in the database
 * @returns Member record
 */
export async function retrieveMemberByID(id: string) {
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
}

/**
 * Get member based on email
 * @param email - Email of member in the database
 * @returns Member record
 */
export async function retrieveMemberByEmail(email: string) {
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
      WHERE email = ${email};
    `;

  return user[0];
}

/**
 * Get member based on customer id
 * @param customerId - Stripe customer id of member in the database
 * @returns Member record
 */
export async function getMemberByCustomerId(customerId: string) {
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
}

/**
 * Get merch orders by email
 * @param email - Email associated with the order in the database
 * @returns All matching order records
 */
export async function retrieveMerchOrders(email: string) {
  const orders = await sql`
      SELECT
        order_id,
        email,
        shirt_size,
        delivery_status,
        order_status,
        order_package
      FROM merch_orders
      WHERE email=${email}
      ORDER BY date DESC 
    `;

  return orders;
}

/**
 * Generate unique session token
 * @param email - Email to be associated with the sessionsetEmailVerification
 * @returns Generated token
 */
export async function setEmailVerification(email: string) {
  const date = new Date().toLocaleString('en-US');

  // 40 characters long
  const tokenId = generateIdFromEntropySize(25);

  // Valid for 1 day
  const expiration = createDate(new TimeSpan(1, 'd'));

  await sql`
    INSERT INTO email_verification_token (id, user_id, email, expires_at, created)
      VALUES( ${tokenId}, ${email}, ${email}, ${expiration}, ${date})
  `;
  parentLogger.debug(`New login token for ${email}`);

  return tokenId;
}

/**
 * Update member to be canceled
 * @param canceledMember - Member subscription information
 * @param logger - Instance used for logging
 */
export async function cancelMember(
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
export async function setMemberUpdate(
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
export async function setMemberShirt(
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
 * Create new member or update if email exists
 * @param memberObj - Member information
 * @param logger - Instance used for logging
 * @returns
 */
export async function setMember(
  memberObj: {
    tier: number;
    name: string;
    phone: string;
    email: string;
    status: string;
    shipping_address: string;
    amount: number;
    customer_id: string;
    newMember: boolean;
    subID: string;
    branch: 'CA' | 'LA' | 'SF';
  },
  logger: Logger,
) {
  const childLogger = logger.child({ step: 'set_member' });

  try {
    const date = new Date().toLocaleString('en-US');

    await sql`
      INSERT INTO members (name, email, tier, last_amount, shipping_address, last_donation, customer_id, phone, subscription_ID, branch)
        VALUES(${memberObj.name}, ${memberObj.email}, ${memberObj.tier}, ${memberObj.amount}, ${memberObj.shipping_address}, ${date}, ${memberObj.customer_id}, ${memberObj.phone},  ${memberObj.subID}, ${memberObj.branch})
        ON CONFLICT (email)
	      DO UPDATE SET tier = ${memberObj.tier}, last_amount = ${memberObj.amount}, last_donation = ${date}, shipping_address = ${memberObj.shipping_address}, customer_id = ${memberObj.customer_id},  subscription_ID = ${memberObj.subID}, branch = ${memberObj.branch}
    `;
    childLogger.info(
      {
        amount: memberObj.amount,
        chapter: memberObj.branch,
        status: memberObj.status,
        subscription_id: memberObj.subID,
        tier: memberObj.tier,
      },
      'Set member in database',
    );

    // If new member, add join date
    if (memberObj.newMember) {
      await sql`
        INSERT INTO members (joined_date, email)
          VALUES(${date}, ${memberObj.email})
          ON CONFLICT (email) 
          DO UPDATE SET joined_date = ${date}
      `;
      childLogger.info('Added join date for new member');
    }

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
export async function addMember(
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
  logger: Logger,
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
export async function updateMemberSubscription(
  data: {
    customerId: string;
    subscriptionId: string;
    amount: number;
    tier: number;
  },
  logger: Logger,
) {
  const childLogger = logger.child({ step: 'add_member_subscription' });

  const { customerId, subscriptionId, amount, tier } = data;

  try {
    const date = new Date().toLocaleString('en-US');

    await sql`
      UPDATE members set subscription_ID = ${subscriptionId}, last_amount = ${amount}, tier = ${tier} WHERE customer_id = ${customerId}
    `;
    childLogger.info(
      {
        subscription_id: subscriptionId,
        amount,
        tier,
      },
      'Updated member with subscription information',
    );

    return;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

/**
 * Retrieve user session based on cookie
 * @returns User session
 */
export async function getSessionCookie() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('auth_session');

  if (sessionId) {
    const { session, user } = await auth.lucia.validateSession(sessionId.value);

    return { session, user };
  }
}

/**
 * Retrieve most recently activated Peak Design promo code
 * @param email - Member email
 * @returns Promo code
 */
export async function getCurrentPeakCode(email: string) {
  const childLogger = parentLogger.child({ step: 'get_current_peak_code' });

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
export async function getNextPeakCode(email: string) {
  const childLogger = parentLogger.child({ step: 'activate_peak_code' });

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
