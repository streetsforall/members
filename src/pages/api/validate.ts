import { verifyRequestOrigin } from "lucia";
import * as auth from '../../server/auth'

import type { NextApiRequest, NextApiResponse } from "next";

async function validateRequest(req: NextApiRequest, res: NextApiResponse): Promise<User | null> {
	const sessionId = req.cookies.get(auth.lucia.sessionCookieName);
	if (!sessionId) {
		return null;
	}
	const { session, user } = await auth.lucia.validateSession(sessionId);
	if (!session) {
		res.setHeader("Set-Cookie", auth.lucia.createBlankSessionCookie().serialize());
	}
	if (session && session.fresh) {
		res.setHeader("Set-Cookie", auth.lucia.createSessionCookie(session.id).serialize());
	}
	return user;
}
