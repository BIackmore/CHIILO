import "dotenv/config";
import { pool } from "@/db";
import { readFile } from "node:fs/promises";
import path from "node:path";

async function migrate() {
  const sqlPath = path.resolve(process.cwd(), "Tepozteco.sql");
  const schema = await readFile(sqlPath, "utf8");

  await pool.query(schema);

  console.log("Schema migrated successfully.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Error during migration:", err);
  process.exit(1);
});
