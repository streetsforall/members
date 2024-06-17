'use server';

import * as auth from './auth'
import { cookies } from "next/headers";
import {cache} from 'react';
import { redirect } from "next/navigation";
import { retrieveMember} from "./dbHelpers"


// validate that a user is signed in

const getUser = cache(async () => {
	const sessionId = cookies().get(auth.lucia.sessionCookieName)?.value ?? null;
	if (!sessionId) return null;
	const { user, session } = await auth.lucia.validateSession(sessionId);
	try {
		if (session && session.fresh) {
			const sessionCookie = auth.lucia.createSessionCookie(session.id);
			cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
		}
		if (!session) {
			const sessionCookie = auth.lucia.createBlankSessionCookie();
			cookies().set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
		}
	} catch {
		console.log('cookie error')
		// Next.js throws error when attempting to set cookies when rendering page
	}
	return user;
});

export async function validate_user() {
	const user = await getUser();

	// if no valid user session, redirect to login portal
	if (!user) {
		redirect("/");
	} else {

		const memberData = await retrieveMember(user.id)
		console.log(memberData)

		return memberData;
	}
}
