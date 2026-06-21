import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  // User.username is optional because the @auth/drizzle-adapter
  // type-asserts AdapterUser without username; we populate it in the
  // jwt callback by reading from the DB.
  interface User extends DefaultUser {
    id: string;
    username?: string;
    // Set only on the credentials path; controls session lifetime. Absent for
    // OAuth/magic-link users, who default to the persistent (remembered) window.
    remember?: boolean;
  }

  interface Session {
    user: {
      id: string;
      username: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    // `false` shortens the token lifetime (see auth.ts jwt.encode). Undefined
    // is treated as remembered.
    remember?: boolean;
  }
}
