import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type DatabaseEnv = {
  DB?: D1Database;
};

export function getD1Database() {
  const database = (env as unknown as DatabaseEnv).DB;
  if (!database) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return database;
}

export function getDb() {
  return drizzle(getD1Database(), { schema });
}
