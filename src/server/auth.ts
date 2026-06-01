import { Lucia, generateIdFromEntropySize } from "lucia";
import { TimeSpan, createDate } from "oslo";
import { PostgresJsAdapter } from "@lucia-auth/adapter-postgresql";
import { sql } from "./db";

// we are using Lucia for user authentication

const adapter = new PostgresJsAdapter(sql, {
	user: "members",
	session: "user_session"
});


export const lucia = new Lucia(adapter, {
	sessionCookie: {
		expires: false,
		attributes: {
			secure: process.env.NODE_ENV === "production"
		}
	},
	getUserAttributes: (attributes) => {
		return {
			emailVerified: attributes.email_verified,
			email: attributes.email
		};
	},
	sessionExpiresIn: new TimeSpan(2, "w") 
});

// IMPORTANT!
declare module "lucia" {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: {
			email: string;
			email_verified: boolean;
		};
	}
}

