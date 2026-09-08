import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/shared/infrastructure/prisma";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      username: string;
      role: Role;
    };
  }
  interface User {
    id: string;
    username: string;
    role: Role;
  }
}

interface AppToken {
  id: string;
  username: string;
  role: Role;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Self-hosted (Vercel or otherwise) — this app owns its own routing, so
  // trusting the incoming Host header is safe. Without this, `next start`
  // rejects every request with UntrustedHost outside of Vercel's own
  // auto-detected trust (dev mode trusts localhost implicitly, which is why
  // this only surfaces in production).
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!username || !password) return null;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      const appToken = token as typeof token & Partial<AppToken>;
      if (user) {
        const appUser = user as { id: string; username: string; role: Role };
        appToken.id = appUser.id;
        appToken.username = appUser.username;
        appToken.role = appUser.role;
      }
      return appToken;
    },
    session({ session, token }) {
      const appToken = token as typeof token & AppToken;
      session.user.id = appToken.id;
      session.user.username = appToken.username;
      session.user.role = appToken.role;
      return session;
    },
  },
});
