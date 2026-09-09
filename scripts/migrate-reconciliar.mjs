// ════════════════════════════════════════════════════════════════════════════
// Reconcilia o LEDGER de migrations (`public.schema_migrations`) com os
// arquivos versionados — sem tocar no schema.
//
//   node --env-file-if-exists=.env.local --env-file-if-exists=.env \
//        scripts/migrate-reconciliar.mjs [--confirmar]
//
// Sem `--confirmar` ele só DIAGNOSTICA (dry-run) — nada é escrito.
//
// PARA QUE SERVE
// `scripts/migrate.mjs` aborta TODA a fila quando uma migration já aplicada tem
// hash diferente do arquivo. É a trava certa: protege contra alguém editar uma
// migration que já rodou. Mas ela também trava o caso benigno — a migration foi
// aplicada a partir de um conteúdo que depois foi editado (ajuste de comentário,
// reformatação) sem que o SQL efetivo mudasse. Nesse caso o banco está correto e
// só o registro ficou para trás; sem uma saída, ninguém consegue aplicar mais
// nada até resolver na unha.
//
// O QUE ELE FAZ E O QUE NÃO FAZ
//   • Atualiza SOMENTE a coluna `hash` das linhas divergentes.
//   • NUNCA executa o SQL da migration, NUNCA altera schema, dados ou funções.
//   • Guarda o hash antigo no `backups/` antes de escrever, para dar ré.
//
// ⚠️ ANTES DE RODAR COM --confirmar: confirme que o banco realmente já contém o
// efeito do arquivo. Para migration que (re)define função, o jeito rápido é
// comparar `pg_get_functiondef` do que está no banco com o que o arquivo produz
// dentro de uma transação revertida. Se o SQL efetivo mudou de verdade, isto
// aqui é a ferramenta ERRADA — o certo é uma migration nova.
// ════════════════════════════════════════════════════════════════════════════
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import pg from "pg";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");
const ESCREVER = process.argv.includes("--confirmar");

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL no ambiente (.env / .env.local).");
  process.exit(1);
}

// Mesmo hash de identidade do runner: normaliza CRLF→LF, porque fim de linha é
// diferença de checkout (Windows × Unix), não edição de conteúdo.
function hashDoArquivo(file) {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
  return crypto.createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
}

const locais = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((file) => ({
    file,
    version: file.replace(/\.sql$/, "").replace(/_.*$/, ""),
    hash: hashDoArquivo(file),
  }));

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  const { rows } = await client.query(
    "select version, name, hash from public.schema_migrations",
  );
  const aplicadas = new Map(rows.map((r) => [r.version, r]));

  const divergentes = [];
  const pendentes = [];
  for (const m of locais) {
    const a = aplicadas.get(m.version);
    if (!a) pendentes.push(m.file);
    else if (a.hash !== m.hash)
      divergentes.push({ ...m, nomeNoBanco: a.name, hashNoBanco: a.hash });
  }
  const orfas = rows.filter((r) => !locais.some((m) => m.version === r.version));

  console.log(
    `Migrations: ${locais.length} locais · ${rows.length} aplicadas · ` +
      `${pendentes.length} pendentes · ${divergentes.length} divergentes · ${orfas.length} órfãs\n`,
  );

  for (const o of orfas) {
    console.log(`⚠ ÓRFÃ  ${o.name} — aplicada no banco, sem arquivo local.`);
    console.log("        Este script NÃO remove registros. Traga o arquivo (git pull).\n");
  }

  if (divergentes.length === 0) {
    console.log("✓ Nenhum hash divergente. Nada a reconciliar.");
    if (pendentes.length > 0)
      console.log(`  ${pendentes.length} pendente(s): rode 'npm run db:migrate'.`);
    process.exit(0);
  }

  for (const d of divergentes) {
    console.log(`✗ DIVERGE  ${d.file}`);
    console.log(`   hash no banco   ${d.hashNoBanco}`);
    console.log(`   hash do arquivo ${d.hash}\n`);
  }

  if (!ESCREVER) {
    console.log("Dry-run — nada foi escrito.");
    console.log("Confirme antes que o banco JÁ contém o efeito destes arquivos.");
    console.log("Depois: npm run db:reconciliar -- --confirmar");
    process.exit(0);
  }

  const backup = path.join(process.cwd(), "backups", `ledger_antes_${Date.now()}.json`);
  await mkdir(path.dirname(backup), { recursive: true });
  await writeFile(backup, JSON.stringify(divergentes, null, 2), "utf8");
  console.log(`Hashes antigos salvos em ${path.relative(process.cwd(), backup)}\n`);

  await client.query("begin");
  for (const d of divergentes) {
    // Casa também pelo hash antigo: se outra pessoa reconciliou no meio do
    // caminho, esta linha não atualiza e a transação inteira é abortada.
    const r = await client.query(
      "update public.schema_migrations set hash = $1 where version = $2 and hash = $3",
      [d.hash, d.version, d.hashNoBanco],
    );
    if (r.rowCount !== 1) {
      await client.query("rollback");
      console.error(`✗ ${d.file}: esperava 1 linha, atualizou ${r.rowCount}. Nada foi alterado.`);
      process.exit(1);
    }
    console.log(`✓ ${d.file} reconciliada`);
  }
  await client.query("commit");
  console.log(`\n✓ ${divergentes.length} registro(s) reconciliado(s). Schema intocado.`);
} finally {
  await client.end();
}
