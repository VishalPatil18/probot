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

// Cast tables because our `.enableRLS()` chain on the Drizzle schema strips
// the `enableRLS` method that the adapter's generic still expects. Runtime
// behaviour is unaffected - the adapter just does plain INSERTs/SELECTs.
// Session lifetimes for the "Remember me" toggle. NextAuth v4 applies
// session.maxAge globally, so the per-login choice is realised by overriding
// the JWT `encode` maxAge from the token's `remember` flag (see jwt.encode
// below): remembered logins persist for 30 days, un-remembered ones expire
// after a day of inactivity. OAuth/magic-link tokens carry no `remember` flag
// and fall through to the long window.
const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60;
const SESSION_MAX_AGE = 24 * 60 * 60;

const baseAdapter = DrizzleAdapter(db, {
  usersTable: users as never,
  accountsTable: accounts as never,
  verificationTokensTable: verificationTokens as never,
});

// OAuth + magic-link flows don't supply a username. Generate one inline so the
// users table's NOT NULL UNIQUE constraint on `username` is satisfied. A future
// onboarding step can let the user pick a real one.
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
    // OAuth/magic-link users without a provider-supplied image get
    // a deterministic animal icon. Seeded by the new username so the same
    // account always gets the same default if the field is ever cleared.
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
    // Token lifetime follows the credentials "Remember me" choice. A `false`
    // flag shortens the encoded maxAge so the session lapses sooner; any other
    // value (including undefined, for OAuth/magic-link) keeps the long window.
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
        // user.hashedPassword can be null for OAuth/magic-link-only accounts.
        // In that case, credentials sign-in is not a valid path.
        if (!user || !user.hashedPassword) return null;

        const ok = await verifyPassword(password, user.hashedPassword);
        if (!ok) return null;

        // Block credentials login until the user has
        // clicked the verification link. Throwing a sentinel string here is
        // the documented NextAuth way to surface a custom error code to the
        // sign-in page (`?error=email_not_verified`).
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
        // Persist the remember choice so token rotations keep the same
        // lifetime. OAuth/magic-link users have no `remember` field; leaving
        // it undefined falls through to the long (remembered) window.
        token.remember = (user as { remember?: boolean }).remember;
      }
      // Re-read username from the DB on every JWT mint so the
      // /onboarding PATCH (which updates users.username) is reflected on the
      // very next request without forcing a sign-out / sign-in cycle. Without
      // this, OAuth/magic-link users land in a redirect loop: dashboard
      // layout sees the stale "user-<8hex>" placeholder and bounces them
      // back to /onboarding. The cost is one DB query per authenticated
      // request - acceptable here and easy to cache later.
      if (token.id) {
        const row = await db.query.users.findFirst({
          where: eq(users.id, token.id),
          columns: { username: true },
        });
        token.username = row?.username ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
      }
      return session;
    },
  },
};
