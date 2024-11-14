import { prisma } from "@/app/utils/db";
import NextAuth, { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";

const options: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
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
        await prisma.user.upsert({
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
  },
};

const handler = NextAuth(options);

export { handler as GET, handler as POST };

