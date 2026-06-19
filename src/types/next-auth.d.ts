import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  // User.username is optional because the @auth/drizzle-adapter
  // type-asserts AdapterUser without username; we populate it in the
  // jwt callback by reading from the DB.
  interface User extends DefaultUser {
    id: string;
    username?: string;
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
  }
}
