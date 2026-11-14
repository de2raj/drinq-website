/**
 * Runs once when the server starts:
 *  1. creates any missing tables (a brand-new database, or tables added since),
 *  2. fills the Product table from data/catalogue.json the first time.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { db } = await import("./lib/db");
  const { DB_PROVIDER, INIT_SQL } = await import("./lib/init-sql");
  try {
    const rows = await db.$queryRawUnsafe<Record<string, string>[]>(
      DB_PROVIDER === "mysql"
        ? "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()"
        : "SELECT name FROM sqlite_master WHERE type='table'",
    );
    const existing = new Set(rows.map((r) => String(r.name ?? r.NAME ?? r.TABLE_NAME)));
    const statements = INIT_SQL.split(/;\s*\n/).map((s) => s.replace(/^--.*$/gm, "").trim()).filter(Boolean);
    const tableOf = (s: string) => s.match(/(?:CREATE TABLE|\bON|ALTER TABLE)\s+[`"](\w+)[`"]/)?.[1];
    const todo = statements.filter((s) => {
      const t = tableOf(s);
      return t && !existing.has(t);
    });
    for (const s of todo) await db.$executeRawUnsafe(s);
    if (todo.length) console.log(`[drinq] Created missing tables in ${DB_PROVIDER} (${todo.length} statements)`);

    const { seedProductsIfEmpty } = await import("./lib/catalogue");
    const n = await seedProductsIfEmpty();
    if (n) console.log(`[drinq] Loaded ${n} products from data/catalogue.json`);
  } catch (e) {
    // The shop can't list products without a database; the log says why.
    console.error("[drinq] Database not ready:", e);
  }
}
