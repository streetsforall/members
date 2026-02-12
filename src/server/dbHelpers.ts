"use server";

import sql from "./db";
import { TimeSpan, createDate } from "oslo";
import { generateIdFromEntropySize } from "lucia";
import * as auth from "./auth";
import { cookies } from "next/headers";
import pino from 'pino';
import { getChapterFromZip } from "./zipUtils";

const logger = pino();

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

export async function setEmailVerification(email: string) {
  const tokenId = generateIdFromEntropySize(25); // 40 characters long
  const date = new Date().toLocaleString("en-US");

  // valid for 1 day
  const expiration = createDate(new TimeSpan(1, "d"));

  await sql`
    INSERT INTO email_verification_token (id, user_id, email, expires_at, created)
      VALUES( ${tokenId}, ${email}, ${email}, ${expiration}, ${date})
  `;
  logger.info(`new login token for ${email}`);
  return tokenId;
}

export async function cancelMember(canceledMember: any) {
  try {
    // this will cancel a member
    const date = new Date().toLocaleString("en-US");

    logger.info(canceledMember, "canceledMember");

    const users = await sql`
    UPDATE members SET tier = ${canceledMember.tier}, last_amount = ${canceledMember.amount}, last_donation = ${date} WHERE email = ${canceledMember.email};
    `;
    logger.info(users, "CANCELLED MEMBER");

    return users;
  } catch (error) {
    logger.error(error);
    return null;
  }
}

export async function setMemberUpdate(memberUpdate: any) {
  try {
    // adds a row to the member_update table
    const date = new Date().toLocaleString("en-US");
    logger.info(memberUpdate, "memberUpdate");

    const zapURL: string = process.env.MEMBER_ZAP!;

    const response = await fetch(zapURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(memberUpdate),
    });
    if (response.ok) {
      logger.info("Data sent to Zapier successfully!");
      // Optionally handle success feedback to the user
    } else {
      logger.info("Failed to send data to Zapier: " + response.status);
      // Optionally handle error feedback to the user
    }


    logger.info(`${memberUpdate.email} ${date} ${memberUpdate.newTier} ${memberUpdate.update}`)
      await sql`
        INSERT INTO member_updates (email, date, newtier, update)
        VALUES(${memberUpdate.email}, ${date}, ${memberUpdate.newTier}, ${memberUpdate.update})
      `;
      return "successfully added new member update";
    } catch (error) {
        logger.error(error, "Error inserting member update:");
        return "failed to add new member update"; // Generic error message
      }

}

export async function setMemberShirt(memberObj: any) {
  try {
    // this adds a member shirt size
    logger.info(memberObj, "shirt _ memberObj");

    await sql`
      INSERT INTO members (email, shirt_size)
        VALUES(${memberObj.email}, ${memberObj.size})
        ON CONFLICT (email) 
	      DO UPDATE SET email = ${memberObj.email}, shirt_size = ${memberObj.size}
    `;
    return "successfully updated member";
  } catch (error) {
    logger.error(error);
    return null;
  }
}

export async function setMember(memberObj: any) {
  try {
    // this will create a new member or
    // if email field matches an email in our database it will update

    const date = new Date().toLocaleString("en-US");
    logger.info(memberObj, "memberObj");

    await sql`
      INSERT INTO members (name, email, tier, last_amount, shipping_address, last_donation, customer_id, phone, subscription_ID, branch)
        VALUES(${memberObj.name}, ${memberObj.email}, ${memberObj.tier}, ${memberObj.amount}, ${memberObj.shipping_address}, ${date}, ${memberObj.customer_id}, ${memberObj.phone},  ${memberObj.subID}, ${memberObj.branch})
        ON CONFLICT (email)
	      DO UPDATE SET tier = ${memberObj.tier}, last_amount = ${memberObj.amount}, last_donation = ${date}, shipping_address = ${memberObj.shipping_address}, customer_id = ${memberObj.customer_id},  subscription_ID = ${memberObj.subID}, branch = ${memberObj.branch}
    `;
    logger.info("updated member");

    // if member is new we make sure they get a data added
    if (memberObj.newMember) {
      await sql`
      INSERT INTO members (joined_date, email)
        VALUES(${date}, ${memberObj.email})
        ON CONFLICT (email) 
	      DO UPDATE SET joined_date = ${date}
  `;
      logger.info("created member added date");
    }

    return "successfully updated member";
  } catch (error) {
    logger.error(error);
    return null;
  }
}

export async function getSessionCookie() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("auth_session");
  if (sessionId) {
    const { session, user } = await auth.lucia.validateSession(sessionId.value);
    return { session, user };
  }
}

export async function getCurrentPeakCode(email: string) {
  try {
    const current_code = await sql`
      SELECT
        code,
        date_used
      FROM peak_discounts
      WHERE email=${email}
      ORDER BY date_used DESC 
    `;

    logger.info(current_code, "current_code");
    const discount_code = current_code[0];

    logger.info(discount_code, "discount_code");
    return discount_code;
  } catch (error) {
    return null;
  }
}

export async function getNextPeakCode(email: any) {
  try {
    const new_code = await sql`
      SELECT
        code
      FROM peak_discounts
      WHERE email IS NULL
      ORDER BY date_used DESC 
    `;
    logger.info(new_code, "new_code");

    const discount_code = new_code[0].code;

    const updated = new Date().toLocaleString("en-US");

    logger.info("email " + email);

    logger.info("updated " + updated);
    logger.info(discount_code, "discount_code");

    await sql`
    INSERT INTO peak_discounts (code, email, date_used)
    VALUES(${discount_code}, ${email}, ${updated})
    ON CONFLICT (code) 
    DO UPDATE SET email = ${email}, date_used = ${updated}
  `;
    logger.info(discount_code);
    return discount_code;
  } catch (error) {
    logger.error(error);
    return "no more codes";
  }
}

// we aren't using this function anywhere
export async function createEmailVerificationToken(
  userId: string,
  email: string
): Promise<string> {
  // optionally invalidate all existing tokens
  // await db.table("email_verification_token").where("user_id", "=", userId).deleteAll();

  const tokenId = generateIdFromEntropySize(25); // 40 characters long

  const timespan = createDate(new TimeSpan(2, "h"));

  const emailtoken = await sql`
    INSERT INTO email_verification_token (id, email, expires_at)
      VALUES(${tokenId}, ${email}, ${timespan})
      ON CONFLICT (email) 
      DO UPDATE SET id = ${tokenId}, expires_at = ${timespan}
    `;

  logger.info(emailtoken, "emailtoken");

  return tokenId;
}
