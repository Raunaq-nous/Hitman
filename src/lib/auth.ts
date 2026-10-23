import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"]
  }
}
import CredentialsProvider from "next-auth/providers/credentials";
import { verifyCredentials } from "@/domain/auth/service";
import { clientIp } from "@/providers/rateLimit";

import { env } from "@/providers/env";

/** Parsed env refuses to start in production without a 32+ character secret. */
function sessionSecret(): string | undefined {
  return env().NEXTAUTH_SECRET;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "m@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;
        // Throws a rate-limit error that next-auth surfaces as a sign-in error.
        return verifyCredentials(credentials.email, credentials.password, clientIp(req?.headers));
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: sessionSecret(),
};

export default NextAuth(authOptions);
