import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// pg.Pool is lazy — it does not open a TCP connection until the first query.
// If DATABASE_URL is unset, `import { db }` still succeeds and the build
// passes; the first runtime query throws instead.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
