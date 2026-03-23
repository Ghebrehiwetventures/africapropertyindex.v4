/**
 * Apply the trust-driven admin RPCs from migrations/013_kazaverde_trust_views.sql.
 * Requires DATABASE_URL in .env (Supabase Dashboard → Settings → Database → Connection string → URI).
 *
 * Usage: npx ts-node --transpile-only scripts/setup_supabase_rpc.ts
 */
import * as path from "path";
import * as fs from "fs";
import { Client } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const SQL_PATH = path.resolve(__dirname, "../migrations/013_kazaverde_trust_views.sql");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "Missing DATABASE_URL. Add it to .env from Supabase Dashboard → Settings → Database → Connection string (URI)."
    );
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const sql = fs.readFileSync(SQL_PATH, "utf-8");
    await client.query(sql);
    console.log("Applied trust feed views + admin RPCs from migrations/013_kazaverde_trust_views.sql.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
