'use server';

import * as auth from './auth'
import { cookies } from "next/headers";
import { cache } from 'react';
import { redirect } from "next/navigation";
import { retrieveMemberByID } from "./dbHelpers"


// validate user session cookie for login

const getUser = cache(async () => {
	const cookieStore = await cookies();
	const sessionId = cookieStore.get(auth.lucia.sessionCookieName)?.value ?? null;
	if (!sessionId) return null;
	const { user, session } = await auth.lucia.validateSession(sessionId);
	try {
		if (session && session.fresh) {
			const sessionCookie = auth.lucia.createSessionCookie(session.id);
			const freshCookieStore = await cookies();
			freshCookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
		}
		if (!session) {
			const sessionCookie = auth.lucia.createBlankSessionCookie();
			const blankCookieStore = await cookies();
			blankCookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
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

		const memberData = await retrieveMemberByID(user.id)

		return memberData;
	}
}

export async function sign_out_user() {
	const sessionCookie = auth.lucia.createBlankSessionCookie();
	const cookieStore = await cookies();
	cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
}