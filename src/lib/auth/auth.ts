import { randomBytes } from "crypto";

import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import type { NextAuthOptions } from "next-auth";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import { decode, encode } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

import { pickDefaultAvatar } from "@/lib/avatars";
import { accounts, db, users, verificationTokens } from "@/lib/db";

import { sendMagicLinkEmail } from "./email";
import { verifyPassword } from "./passwords";
import { loginInput } from "./schemas";

const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60;
const SESSION_MAX_AGE = 24 * 60 * 60;

const baseAdapter = DrizzleAdapter(db, {
  usersTable: users as never,
  accountsTable: accounts as never,
  verificationTokensTable: verificationTokens as never,
});

async function generateUniqueUsername(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `user-${randomBytes(4).toString("hex")}`;
    const existing = await db.query.users.findFirst({
      where: eq(users.username, candidate),
      columns: { id: true },
    });
    if (!existing) return candidate;
  }
  throw new Error("Failed to generate unique username after 5 attempts");
}

const adapter: Adapter = {
  ...baseAdapter,
  async createUser(data: AdapterUser) {
    const username = await generateUniqueUsername();
    const image = data.image ?? pickDefaultAvatar(username);
    const [created] = await db
      .insert(users)
      .values({
        username,
        email: data.email,
        emailVerified: data.emailVerified,
        name: data.name ?? null,
        image,
      })
      .returning();
    if (!created) {
      throw new Error("Failed to create user row");
    }
    return {
      id: created.id,
      name: created.name,
      email: created.email,
      image: created.image,
      emailVerified: created.emailVerified,
    } as AdapterUser;
  },
};

export const authOptions: NextAuthOptions = {
  adapter,
  session: { strategy: "jwt", maxAge: REMEMBER_MAX_AGE },
  jwt: {
    async encode(params) {
      const remembered = params.token?.remember !== false;
      return encode({
        ...params,
        maxAge: remembered ? REMEMBER_MAX_AGE : SESSION_MAX_AGE,
      });
    },
    decode,
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginInput.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!user || !user.hashedPassword) return null;

        const ok = await verifyPassword(password, user.hashedPassword);
        if (!ok) return null;

        if (!user.emailVerified) {
          throw new Error("email_not_verified");
        }

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          remember: credentials?.remember === "true",
        };
      },
    }),
    EmailProvider({
      from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
      sendVerificationRequest: async ({ identifier, url }) => {
        await sendMagicLinkEmail({ to: identifier, url });
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.remember = (user as { remember?: boolean }).remember;
      }
      if (token.id) {
        const row = await db.query.users.findFirst({
          where: eq(users.id, token.id),
          columns: { username: true, name: true, image: true },
        });
        token.username = row?.username ?? "user";
        token.name = row?.name ?? null;
        token.picture = row?.image ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.name = token.name ?? null;
        session.user.image = token.picture ?? null;
      }
      return session;
    },
  },
};
