import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

import { env } from "@/config";

// Connect to the default 'postgres' database instead of your application database
const sql_connection = postgres({
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: "postgres", // Connect to the default 'postgres' database instead
});

try {
  // eslint-disable-next-line no-console
  console.log(`Terminating all connections to database "${env.DB_NAME}"...`);

  // First, terminate all existing connections to the database
  await sql_connection.unsafe(`
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '${env.DB_NAME}'
      AND pid <> pg_backend_pid();
  `);
  // eslint-disable-next-line no-console
  console.log(`Dropping database "${env.DB_NAME}"...`);

  // Drop the database
  await sql_connection.unsafe(`DROP DATABASE IF EXISTS ${env.DB_NAME}`);

  // eslint-disable-next-line no-console
  console.log(`Database "${env.DB_NAME}" has been dropped successfully.`);

  // Create a new empty database with the same name
  // eslint-disable-next-line no-console
  console.log(`Creating new empty database "${env.DB_NAME}"...`);
  await sql_connection.unsafe(`CREATE DATABASE ${env.DB_NAME}`);

  // eslint-disable-next-line no-console
  console.log(`Empty database "${env.DB_NAME}" has been created successfully.`);

  // remove the contents of the migrations folder inside edoshop-backend/src/db/migrations
  // Use fileURLToPath to properly handle paths on Windows
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.join(__dirname, "migrations");
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir);
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log(`Emptied migrations folder "${migrationsDir}" successfully.`);
} catch (error) {
  console.error(`Error managing database: ${error}`);
  throw error;
} finally {
  // Always close the connection
  await sql_connection.end();
}
