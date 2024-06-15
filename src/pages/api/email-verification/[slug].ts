import { isWithinExpirationDate } from "oslo";
import { NextApiRequest, NextApiResponse } from "next";
import { useRouter } from 'next/router'
import { Lucia } from "lucia";
import * as auth from '../../../server/auth'
import sql from '../../../server/db'

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse
) {

	console.log('getting token')

	const { slug } = req.query

	const verificationToken = slug;
	console.log(slug)


	if (verificationToken) {

		console.log(verificationToken)

		// check if token in URL is equal to a saved email token
		const token = await sql`
			SELECT * FROM email_verification_token
			WHERE id = ${verificationToken}
		`
		
		const first_token = token[0]

		// delete token from table (it's been cooked!)
		await sql`
			DELETE FROM email_verification_token
			WHERE id = ${first_token.id};
			`
		


		if (!token || !isWithinExpirationDate(first_token.expires_at)) {
			return new Response(null, {
				status: 400
			});
		}


		const select_users = await sql`
			SELECT * FROM members
			WHERE email = ${first_token.user_id}
			`

		const user = select_users[0]
		
		console.log(user)

		if (!user || user.email !== first_token.email) {
			return new Response(null, {
				status: 400
			});
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

		return new Response(null, {
			status: 302,
			headers: {
				Location: "/",
				"Set-Cookie": sessionCookie.serialize(),
				"Referrer-Policy": "no-referrer"
			}
		});
	}
}