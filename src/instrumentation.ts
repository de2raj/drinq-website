/** Runs once when the server starts: creates the order tables in a brand-new database. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { db } = await import("./lib/db");
  const { DB_PROVIDER, INIT_SQL } = await import("./lib/init-sql");
  try {
    const rows = await db.$queryRawUnsafe<unknown[]>(
      DB_PROVIDER === "mysql"
        ? "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'Order'"
        : "SELECT name FROM sqlite_master WHERE type='table' AND name='Order'",
    );
    if (rows.length) return;
    const statements = INIT_SQL.split(/;\s*\n/).map((s) => s.replace(/^--.*$/gm, "").trim()).filter(Boolean);
    for (const s of statements) await db.$executeRawUnsafe(s);
    console.log(`[drinq] Created order tables in ${DB_PROVIDER} (${statements.length} statements)`);
  } catch (e) {
    // The shop still browses without a database; checkout will show an error until it's fixed.
    console.error("[drinq] Database not ready:", e);
  }
}
