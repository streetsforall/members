import { Lucia, generateIdFromEntropySize } from "lucia";
import { TimeSpan, createDate } from "oslo";
import { PostgresJsAdapter } from "@lucia-auth/adapter-postgresql";
import postgres from "postgres";
import sql from "./db"

// we are using Lucia for user authentication

const adapter = new PostgresJsAdapter(sql, {
	user: "members",
	session: "user_session"
});


export const lucia = new Lucia(adapter, {
	sessionCookie: {
		expires: false,
		attributes: {
			// set to `true` when using HTTPS
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

