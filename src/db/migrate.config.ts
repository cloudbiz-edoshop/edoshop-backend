/** Migration paths for production — no drizzle-kit import (devDependency). */
export const migrateConfig = {
  migrationsFolder: "./src/db/migrations",
  migrationsSchema: "public",
} as const;
