import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = Bun.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize the database");
}

export const client = postgres(databaseUrl, {
  max: 1,
});

export const db = drizzle(client, { schema });
