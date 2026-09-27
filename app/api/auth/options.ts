import { appPrisma } from "@/app/utils/db";
import { toLogDetail } from "@/app/lib/auth-log";
import { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { getLogger } from "@/lib/fq-logger";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET as string,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  logger: {
    // Every OAuth/sign-in failure becomes a redirect, never a throw, so the
    // instrumentation onRequestError hook never sees these — this logger is
    // the sole Sentry capture path (verified payload shapes against
    // next-auth@4.24.10 core/routes/*: Error objects + provider ids only).
    error: (code: string, ...message: unknown[]) => {
      getLogger().error(`auth.nextauth.${code}`, {
        detail: toLogDetail(message),
      });
    },
    warn: (code: string, ...message: unknown[]) => {
      getLogger().warn(`auth.nextauth.${code}`, {
        detail: toLogDetail(message),
      });
    },
  },
  callbacks: {
    async signIn({ user, profile }) {
      try {
        if (!user.email) throw new Error("Failed to sign in");
        const userData = {
          email: user.email,
          name: user.name || profile?.name || user.email,
        };
        await appPrisma.user.upsert({
          where: { email: user.email },
          update: userData,
          create: userData,
        });
        return true;
      } catch (e) {
        getLogger().error("auth.signIn.failed", { err: e, email: user.email });
        return false;
      }
    },
    async session({ session }) {
      try {
        if (!session?.user?.email) throw new Error("Failed to get user data");
        const userData = await appPrisma.user.findUnique({
          where: { email: session.user.email },
        });
        if (!userData) throw new Error("Failed to get user data");
        session.user = userData;
        return session;
      } catch (e) {
        getLogger().warn("auth.session.lookup_failed", {
          err: e,
          email: session?.user?.email,
        });
        return session;
      }
    },
    async jwt({ token }) {
      try {
        if (!token?.email) throw new Error("Failed to get user data");
        const userData = await appPrisma.user.findUnique({
          where: { email: token.email },
        });
        if (!userData) throw new Error("Failed to get user data");
        return { ...token, ...userData };
      } catch (e) {
        getLogger().warn("auth.jwt.lookup_failed", { err: e, email: token?.email });
        return token;
      }
    },
  },
};

