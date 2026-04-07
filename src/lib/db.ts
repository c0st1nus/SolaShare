import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env";
import * as schema from "../db/schema";

const databaseUrl =
  env.NODE_ENV === "test" && env.TEST_DATABASE_URL ? env.TEST_DATABASE_URL : env.DATABASE_URL;

export const client = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

export const closeDatabaseConnection = async () => {
  await client.end();
};
