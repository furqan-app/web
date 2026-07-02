import { appPrisma } from "@/app/utils/db";
import { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET as string,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
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
        console.error(e);
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        session.user = {};
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        return {};
      }
    },
  },
};

