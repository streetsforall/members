'use server'

import { isWithinExpirationDate } from "oslo";
import { cookies } from 'next/headers'
import * as auth from './auth'
import sql from './db'


// verify email token for user login
// create session cookie

export async function verify_token(token: string) {

	if (!token) {
		return 'No token provided';
	}

	console.log('token', token)

	// check if token in URL is equal to a saved email token
	const check_token = await sql`
		SELECT * FROM email_verification_token
		WHERE id = ${token}
	`

	const first_token = check_token[0]

	if (!first_token) {
		return ('Invalid Token. Please request a new email link')
	}


	// Commenting this out - causes some problems on mobile
	// where a preview window is created before goiing to the url
	// but that burns the cookie and login fails

	// delete token from table (it's been cooked!)

	// await sql`
	// 	DELETE FROM email_verification_token
	// 	WHERE id = ${first_token.id};
	// 	`



	if (!token || !isWithinExpirationDate(first_token.expires_at)) {
		return ('Token expired. Please request a new email link.')
	}


	const select_users = await sql`
		SELECT * FROM members
		WHERE UPPER(email) LIKE UPPER(${first_token.user_id})
		`

	const user = select_users[0]
	console.log('logging in', user)


	if (!user) {
		console.log('email does not match')
		return ('not a matching email')
	}

	await auth.lucia.invalidateUserSessions(user.id);

	// update member with a validated email
	await sql `
	UPDATE members
	SET email_verified = TRUE
	WHERE id = ${user.id};
	`

	const session = await auth.lucia.createSession(user.id, {});
	const sessionCookie = auth.lucia.createSessionCookie(session.id);

	console.log('cookie', sessionCookie);

	const cookieStore = await cookies();
	cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

	// Return success and user ID for client-side redirect
	return { success: true, userId: user.id };
}
