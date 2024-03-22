import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";

export const options = {
  providers: [
    GoogleProvider({
      profile(profile) {
        console.log("Profile Google: ", profile);

        let userRole = "Member";

        return {
          ...profile,
          id: profile.sub,
          role: userRole,
        };
      },

      clientId: process.env.GOOGLE_ID ?? "",
      clientSecret: process.env.GOOGLE_SECRET ?? "",
    }),
    AppleProvider({
      profile(profile) {
        console.log("Profile Apple: ", profile);

        let userRole = "Member";

        return {
          ...profile,
          id: profile.sub,
          role: userRole,
        };
      },

      clientId: process.env.APPLE_ID ?? "",
      clientSecret: process.env.APPLE_SECRET ?? "",
    }),
  ],

  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) token.role = user.role;

      return token;
    },

    async session({ session, token }: { session: any; token: any }) {
      if (token) session.role = token.role;

      return session;
    },
  },
};
