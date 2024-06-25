'use server'

import sql from './db'
import { TimeSpan, createDate } from "oslo";
import { generateIdFromEntropySize } from "lucia";
import * as auth from './auth'
import { cookies } from 'next/headers'

export async function retrieveMembers() {

  const users = await sql`
      SELECT
        first_name,
        last_name,
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
        first_name,
        last_name,
        email,
        id,
        last_amount,
        last_donation,
        tier,
        active
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



export async function setMember(first_name: string, last_name: string, email: string, active: boolean, tier: number, last_amount: number) {

  // this will create a new member or
  // if email field matches an email in our database 
  // it will update the 'active' field

  const last_donation = (new Date()).toLocaleString("en-US")

  console.log(first_name, last_name, email, active, tier, last_amount, last_donation)

  const users = await sql`
      INSERT INTO members (first_name, last_name, email, active, tier, last_amount, last_donation)
        VALUES(${first_name}, ${last_name}, ${email}, ${active}, ${tier}, ${last_amount}, ${last_donation})
        ON CONFLICT (email) 
	      DO UPDATE SET active = ${active}, tier = ${tier}, last_amount = ${last_amount}
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



