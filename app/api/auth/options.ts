import { appPrisma } from "@/app/utils/db";
import { toLogDetail } from "@/app/lib/auth-log";
import { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { OAuth2Client } from "google-auth-library";
import { getLogger } from "@/lib/fq-logger";

const googleIdTokenClient = new OAuth2Client();

export async function verifyNativeGoogleIdToken(
  idToken: string,
): Promise<{ email: string; name: string } | null> {
  try {
    const audience = process.env.GOOGLE_CLIENT_ID;
    if (!audience) {
      getLogger().error("auth.native_google.missing_client_id", {});
      return null;
    }
    const ticket = await googleIdTokenClient.verifyIdToken({
      idToken,
      audience,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email || payload.email_verified !== true) {
      return null;
    }
    return { email: payload.email, name: payload.name || payload.email };
  } catch (e) {
    getLogger().warn("auth.native_google.verify_failed", { err: e });
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET as string,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      id: "google-native",
      name: "Google (native)",
      credentials: { idToken: { type: "text" } },
      async authorize(credentials) {
        const idToken = credentials?.idToken;
        if (!idToken || typeof idToken !== "string") return null;
        const verified = await verifyNativeGoogleIdToken(idToken);
        if (!verified) return null;
        const user = await appPrisma.user.upsert({
          where: { email: verified.email },
          update: { name: verified.name },
          create: { email: verified.email, name: verified.name },
          select: { id: true, name: true, email: true },
        });
        return { id: String(user.id), name: user.name, email: user.email };
      },
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
          select: { id: true, name: true, email: true },
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
      const sanitizedToken = { ...token };
      delete (sanitizedToken as Record<string, unknown>).password;
      delete (sanitizedToken as Record<string, unknown>).created_at;
      delete (sanitizedToken as Record<string, unknown>).updated_at;

      try {
        if (!sanitizedToken?.email) throw new Error("Failed to get user data");
        const userData = await appPrisma.user.findUnique({
          where: { email: sanitizedToken.email },
          select: { id: true, name: true, email: true },
        });
        if (!userData) throw new Error("Failed to get user data");
        return { ...sanitizedToken, ...userData };
      } catch (e) {
        getLogger().warn("auth.jwt.lookup_failed", {
          err: e,
          email: sanitizedToken?.email,
        });
        return sanitizedToken;
      }
    },
  },
};

