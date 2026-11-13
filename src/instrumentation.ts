/** Runs once when the server starts: creates the order tables in a brand-new database. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { db } = await import("./lib/db");
  const { INIT_SQL } = await import("./lib/init-sql");
  const rows = await db.$queryRawUnsafe<{ name: string }[]>(`SELECT name FROM sqlite_master WHERE type='table' AND name='Order'`);
  if (rows.length) return;
  const statements = INIT_SQL.split(/;\s*\n/).map((s) => s.replace(/^--.*$/gm, "").trim()).filter(Boolean);
  for (const s of statements) await db.$executeRawUnsafe(s);
  console.log(`[drinq] Created order tables (${statements.length} statements)`);
}
