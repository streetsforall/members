'use server'

import sql from './db'
import { TimeSpan, createDate } from "oslo";
import { generateIdFromEntropySize } from "lucia";
import * as auth from './auth'
import { cookies } from 'next/headers'

export async function retrieveMembers() {

  const users = await sql`
      SELECT
        name,
        email,
        active
      FROM members
    `
  console.log(users)
  return users
}


export async function retrieveMember(id: string) {

  const user = await sql`
      SELECT
        name,
        email,
        id,
        last_amount,
        last_donation,
        tier
      FROM members
      WHERE id = ${id};
    `
  return user[0]
}

export async function setEmailVerification(email: string) {

  const tokenId = generateIdFromEntropySize(25); // 40 characters long
  const expiration = createDate(new TimeSpan(10, "d"))

  await sql`
    INSERT INTO email_verification_token (id, user_id, email, expires_at)
      VALUES( ${tokenId}, ${email}, ${email}, ${expiration})
  `
  console.log('db helper ', tokenId)
  return tokenId

}

export async function createEmailVerificationToken(userId: string, email: string): Promise<string> {
  // optionally invalidate all existing tokens

  // await db.table("email_verification_token").where("user_id", "=", userId).deleteAll();
  const tokenId = generateIdFromEntropySize(25); // 40 characters long

  const timespan = createDate(new TimeSpan(2, "h"))

  await sql`
    INSERT INTO email_verification_token (id, email, expires_at)
      VALUES(${tokenId}, ${email}, ${timespan})
      ON CONFLICT (email) 
      DO UPDATE SET id = ${tokenId}, expires_at = ${timespan}
    `

  return tokenId;
}



export async function setMember(memberObj : any) {

  // this will create a new member or
  // if email field matches an email in our database it will update

  const last_donation = (new Date()).toLocaleString("en-US")

  console.log(memberObj)

  const users = await sql`
      INSERT INTO members (name, email, tier, last_amount, shipping_address, last_donation, customer_id, phone)
        VALUES(${memberObj.name}, ${memberObj.email}, ${memberObj.tier}, ${memberObj.amount}, ${memberObj.shipping_address}, ${last_donation}, ${memberObj.customer_id}, ${memberObj.phone})
        ON CONFLICT (email) 
	      DO UPDATE SET tier = ${memberObj.tier}, last_amount = ${memberObj.amount}, last_donation = ${last_donation}
    `
  console.log(users)
  return users
}


export async function getSessionCookie() {
  const sessionId = cookies().get('auth_session');
  if (sessionId) {
    const { session, user } = await auth.lucia.validateSession(sessionId.value);
    return { session, user }
  }
}


export async function getNextPeakCode(email : any) {
  
  try {
    const new_code = await sql`
      SELECT
        code
      FROM peak_discounts
      WHERE email IS NULL
    `
    
    const discount_code = new_code[0].code

    const updated = (new Date()).toLocaleString("en-US")

    await sql`
    INSERT INTO peak_discounts (code, email, date_used)
    VALUES(${discount_code}, ${email.email}, ${updated})
    ON CONFLICT (code) 
    DO UPDATE SET email = ${email.email}, date_used = ${updated}
  `
    console.log(discount_code)
    return discount_code
  } catch (error) {
    return ('no more codes')
  }


}



