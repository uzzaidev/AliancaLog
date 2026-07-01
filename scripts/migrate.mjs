// ════════════════════════════════════════════════════════════════════════════
// Aplica as migrations pendentes de supabase/migrations/*.sql ao banco em
// DATABASE_URL. Cada arquivo roda numa transação (tudo-ou-nada) e é registrado
// em public.schema_migrations para não rodar de novo.
//
//   npm run db:migrate      (usa node --env-file=.env.local)
//
// Se uma migration já aplicada tiver o conteúdo alterado (hash diferente), o
// script aborta — não edite migrations aplicadas, crie uma nova.
// ════════════════════════════════════════════════════════════════════════════
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "./lib/pg.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "supabase", "migrations");

function loadMigrations() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      return {
        file,
        version: file.replace(/\.sql$/, "").replace(/_.*$/, ""),
        hash: crypto.createHash("sha256").update(sql).digest("hex"),
        sql,
      };
    });
}

async function main() {
  const client = createClient();
  await client.connect();
  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        version    text primary key,
        name       text not null,
        hash       text not null,
        applied_at timestamptz not null default now()
      );
    `);

    const { rows } = await client.query(
      "select version, hash from public.schema_migrations",
    );
    const appliedByVersion = new Map(rows.map((r) => [r.version, r.hash]));

    const migrations = loadMigrations();
    const pending = [];
    for (const m of migrations) {
      const appliedHash = appliedByVersion.get(m.version);
      if (appliedHash === undefined) {
        pending.push(m);
      } else if (appliedHash !== m.hash) {
        console.error(
          `\n✗ ${m.file}: já aplicada, mas o conteúdo mudou (hash difere).\n` +
            "  Não edite migrations já aplicadas — crie uma nova. Abortando.",
        );
        process.exit(1);
      }
    }

    console.log(
      `Migrations: ${migrations.length} · aplicadas: ${appliedByVersion.size} · pendentes: ${pending.length}`,
    );
    if (pending.length === 0) {
      console.log("Nada a fazer — banco sincronizado.");
      return;
    }

    for (const m of pending) {
      process.stdout.write(`→ aplicando ${m.file} … `);
      try {
        await client.query("begin");
        await client.query(m.sql);
        await client.query(
          "insert into public.schema_migrations (version, name, hash) values ($1, $2, $3)",
          [m.version, m.file, m.hash],
        );
        await client.query("commit");
        console.log("ok");
      } catch (err) {
        await client.query("rollback").catch(() => {});
        console.log("FALHOU");
        console.error(`\n✗ Erro em ${m.file}:\n  ${err.message}`);
        process.exit(1);
      }
    }
    console.log(`\n✓ ${pending.length} migration(s) aplicada(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Erro:", err.message ?? err);
  process.exit(1);
});
