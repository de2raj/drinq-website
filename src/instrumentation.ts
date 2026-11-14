/**
 * Runs once when the server starts and brings the database up to date:
 *  1. creates missing tables (a brand-new database, or tables added since),
 *  2. adds missing columns to existing tables (fields added since; all have defaults or allow empty),
 *  3. fills the Product table from data/catalogue.json the first time.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { db } = await import("./lib/db");
  const { DB_PROVIDER, INIT_SQL } = await import("./lib/db-init.generated");
  const mysql = DB_PROVIDER === "mysql";
  const q = (name: string) => (mysql ? `\`${name}\`` : `"${name}"`);
  try {
    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      mysql
        ? "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()"
        : "SELECT name FROM sqlite_master WHERE type='table'",
    );
    const existing = new Set(rows.map((r) => String(r.name ?? r.NAME ?? r.TABLE_NAME)));
    const statements = INIT_SQL.split(/;\s*\n/).map((s) => s.replace(/^--.*$/gm, "").trim()).filter(Boolean);
    const tableOf = (s: string) => s.match(/(?:CREATE TABLE|\bON|ALTER TABLE)\s+[`"](\w+)[`"]/)?.[1];

    // 1. Missing tables.
    const todo = statements.filter((s) => {
      const t = tableOf(s);
      return t && !existing.has(t);
    });
    for (const s of todo) await db.$executeRawUnsafe(s);
    if (todo.length) console.log(`[drinq] Created missing tables in ${DB_PROVIDER} (${todo.length} statements)`);

    // 2. Missing columns on tables that already existed.
    let added = 0;
    for (const s of statements.filter((x) => x.startsWith("CREATE TABLE"))) {
      const table = tableOf(s)!;
      if (!existing.has(table)) continue;
      const cols = await db.$queryRawUnsafe<Record<string, unknown>[]>(
        mysql
          ? `SELECT column_name AS name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = '${table}'`
          : `PRAGMA table_info(${q(table)})`,
      );
      const have = new Set(cols.map((c) => String(c.name ?? c.NAME ?? c.COLUMN_NAME)));
      const defs = s.slice(s.indexOf("(") + 1, s.lastIndexOf(")")).split(/,\s*\n/).map((l) => l.trim());
      for (const def of defs) {
        const col = def.match(/^[`"](\w+)[`"]\s/)?.[1];
        if (!col || have.has(col) || /PRIMARY KEY|AUTOINCREMENT|AUTO_INCREMENT/i.test(def)) continue;
        await db.$executeRawUnsafe(`ALTER TABLE ${q(table)} ADD COLUMN ${def}`);
        added++;
      }
    }
    if (added) console.log(`[drinq] Added ${added} new columns`);

    // 3. First start: load the products.
    const { seedProductsIfEmpty } = await import("./lib/catalogue");
    const n = await seedProductsIfEmpty();
    if (n) console.log(`[drinq] Loaded ${n} products from data/catalogue.json`);
  } catch (e) {
    console.error("[drinq] Database not ready:", e);
  }
}
