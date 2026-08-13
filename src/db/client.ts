import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;
const isLocalDb = connectionString?.includes("localhost") || connectionString?.includes("127.0.0.1");

const pool =
  globalThis.__pgPool ??
  new Pool({
    connectionString,
    // Supabase (and most managed Postgres) require TLS; local Docker Postgres does not speak it.
    ssl: isLocalDb ? false : { rejectUnauthorized: false },
    // Explicit bounds so a cold/exhausted pool fails fast with a clear timeout
    // error instead of queuing silently — pg's own defaults (no connect
    // timeout, max 10) previously left this undiagnosable.
    max: 10,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__pgPool = pool;
}

export const db = drizzle(pool, { schema });
