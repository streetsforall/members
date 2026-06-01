'use server'

import { isWithinExpirationDate } from "oslo";
import { cookies } from 'next/headers'
import * as auth from './auth'
import { getMemberByEmail, getSessionToken, updateMemberEmailVerification } from "./db";


// verify email token for user login
// create session cookie

export async function verify_token(token: string) {

	if (!token) {
		return 'No token provided';
	}

	console.log('token', token)

	// check if token in URL is equal to a saved email token
	const check_token = await getSessionToken({id: token});

	if (!check_token) {
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



	if (!token || !isWithinExpirationDate(check_token.expires_at)) {
		return ('Token expired. Please request a new email link.')
	}


	const user = await getMemberByEmail(check_token.user_id);

	console.log('logging in', user)


	if (!user) {
		console.log('email does not match')
		return ('not a matching email')
	}

	await auth.lucia.invalidateUserSessions(user.id);

	// update member with a validated email
	await updateMemberEmailVerification({ id: user.id, isEmailVerified: true });

	const session = await auth.lucia.createSession(user.id, {});
	const sessionCookie = auth.lucia.createSessionCookie(session.id);

	console.log('cookie', sessionCookie);

	const cookieStore = await cookies();
	cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);

	// Return success and user ID for client-side redirect
	return { success: true, userId: user.id };
}
