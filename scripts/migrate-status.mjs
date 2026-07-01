// ════════════════════════════════════════════════════════════════════════════
// Mostra o estado das migrations: quais já foram aplicadas, quais estão pendentes
// e alerta se o conteúdo de uma aplicada mudou (hash divergente).
//
//   npm run db:status       (usa node --env-file=.env.local)
//
// Sai com código 2 se houver migrations pendentes (útil em CI).
// ════════════════════════════════════════════════════════════════════════════
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "./lib/pg.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

async function main() {
  const local = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      return {
        file,
        version: file.replace(/\.sql$/, "").replace(/_.*$/, ""),
        hash: crypto.createHash("sha256").update(sql).digest("hex"),
      };
    });

  const client = createClient();
  await client.connect();
  let applied = new Map();
  try {
    const res = await client
      .query("select version, hash, applied_at from public.schema_migrations")
      .catch(() => null);
    if (res === null) {
      console.log(
        "Tabela public.schema_migrations ainda não existe — rode 'npm run db:migrate'.\n",
      );
    } else {
      applied = new Map(res.rows.map((r) => [r.version, r]));
    }
  } finally {
    await client.end();
  }

  console.log("─── Migrations locais ───────────────────────────────────────");
  let pending = 0;
  for (const m of local) {
    const row = applied.get(m.version);
    let status;
    if (!row) {
      status = "✗ PENDENTE";
      pending++;
    } else if (row.hash !== m.hash) {
      status = "⚠ HASH DIVERGE";
    } else {
      status = "✓ aplicada";
    }
    const when = row ? `  (${new Date(row.applied_at).toISOString()})` : "";
    console.log(`  ${status.padEnd(16)} ${m.file}${when}`);
  }

  console.log(
    `\nLocais: ${local.length} · aplicadas: ${applied.size} · pendentes: ${pending}`,
  );
  if (pending > 0) {
    console.log("Para aplicar: npm run db:migrate");
    process.exit(2);
  }
}

main().catch((err) => {
  console.error("Erro:", err.message ?? err);
  process.exit(1);
});
