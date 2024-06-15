import { Lucia, generateIdFromEntropySize } from "lucia";
import { TimeSpan, createDate } from "oslo";
import { PostgresJsAdapter } from "@lucia-auth/adapter-postgresql";
import postgres from "postgres";
import sql from "./db"

// we are using Lucia for user authentication

const db = postgres();

const adapter = new PostgresJsAdapter(db, {
	user: "auth_user",
	session: "user_session"
});


export const lucia = new Lucia(adapter, {
	sessionCookie: {
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

async function createEmailVerificationToken(userId: string, email: string): Promise<string> {
	// optionally invalidate all existing tokens

	// await db.table("email_verification_token").where("user_id", "=", userId).deleteAll();
	const tokenId = generateIdFromEntropySize(25); // 40 characters long
	
	const timespan = createDate(new TimeSpan(2, "h"))

	const users = await sql`
	INSERT INTO email_verification_token (id, email, expires_at)
	  VALUES(${tokenId}, ${email}, ${timespan})
	  ON CONFLICT (email) 
		DO UPDATE SET id = ${tokenId}, expires_at = ${timespan}
  `

	return tokenId;
}