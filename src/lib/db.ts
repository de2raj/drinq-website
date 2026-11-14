import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * GoDaddy Node.js Hosting injects its managed MySQL as DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD.
 * Everywhere else DATABASE_URL is used (SQLite file on the Mac and on cPanel).
 */
function databaseUrl() {
  const e = process.env;
  if (e.DB_HOST && e.DB_NAME && e.DB_USER) {
    const auth = `${encodeURIComponent(e.DB_USER)}:${encodeURIComponent(e.DB_PASSWORD ?? "")}`;
    return `mysql://${auth}@${e.DB_HOST}:${e.DB_PORT || 3306}/${encodeURIComponent(e.DB_NAME)}`;
  }
  return e.DATABASE_URL;
}

const g = globalThis as unknown as { prisma?: PrismaClient };
export const db = g.prisma ?? new PrismaClient({ datasourceUrl: databaseUrl() });
if (process.env.NODE_ENV !== "production") g.prisma = db;
