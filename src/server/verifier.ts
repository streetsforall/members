'use server'

import { isWithinExpirationDate } from "oslo";
import { useRouter } from 'next/router'
import { redirect } from 'next/navigation'
import { Lucia } from "lucia";
import { cookies } from 'next/headers'
import * as auth from './auth'
import sql from './db'


// verify email token for user login
// create session cookie 

export async function verify_token(token: string) {

	if (token) {

		console.log('token', token)

		// check if token in URL is equal to a saved email token
		const check_token = await sql`
			SELECT * FROM email_verification_token
			WHERE id = ${token}
		`
		
		const first_token = check_token[0]

		console.log(first_token)

		if (!first_token) {
			return ('Please request a new email token')
		}
		
		// delete token from table (it's been cooked!)

		await sql`
			DELETE FROM email_verification_token
			WHERE id = ${first_token.id};
			`
		


		if (!token || !isWithinExpirationDate(first_token.expires_at)) {
			return ('email token expired')
		}


		const select_users = await sql`
			SELECT * FROM members
			WHERE email = ${first_token.user_id}
			`

		const user = select_users[0]
		
		console.log(user)

		if (!user || user.email !== first_token.email) {
			console.log('email does not match')
			return ('not a matching email')
		}

		console.log(user.id)

		await auth.lucia.invalidateUserSessions(user.id);

		// update member with a validated email
		await sql `
		UPDATE members
		SET email_verified = TRUE
		WHERE id = ${user.id};
		`

		const session = await auth.lucia.createSession(user.id, {});
		const sessionCookie = auth.lucia.createSessionCookie(session.id);

		console.log('cookie', sessionCookie)

		cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

		redirect(`../u/${user.id}`)

	}
}
