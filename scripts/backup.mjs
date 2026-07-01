// ════════════════════════════════════════════════════════════════════════════
// Backup do schema `public` via pg_dump, usando a conexão em DATABASE_URL.
// Gera um .sql em backups/ (fora do git). Faça um antes de migrations arriscadas.
//
//   npm run db:backup                 # nome = timestamp
//   npm run db:backup -- antes_da_x   # rótulo custom
//
// Requer pg_dump instalado (PostgreSQL client). Usa o Session pooler (porta 5432),
// que é compatível com pg_dump — o transaction pooler (6543) não é.
// ════════════════════════════════════════════════════════════════════════════
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getConnectionString } from "./lib/pg.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

const url = new URL(getConnectionString());
if (url.port === "6543") {
  console.error(
    "DATABASE_URL aponta para o transaction pooler (6543), incompatível com pg_dump.\n" +
      "Use a string do 'Session pooler' (porta 5432).",
  );
  process.exit(1);
}

// Localiza o pg_dump mais recente (recusa dumpar um servidor mais novo que ele).
function findPgDump() {
  for (const v of ["18", "17", "16", "15"]) {
    const exe = `C:\\Program Files\\PostgreSQL\\${v}\\bin\\pg_dump.exe`;
    if (fs.existsSync(exe)) return exe;
  }
  return "pg_dump"; // deixa o PATH resolver
}
const pgDump = findPgDump();

const label = process.argv[2] || new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(projectRoot, "backups");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `alianca_public_${label}.sql`);

console.log(`→ pg_dump (${execFileSync(pgDump, ["--version"]).toString().trim()})`);
console.log(`→ destino: ${path.relative(projectRoot, outFile)}`);

const res = spawnSync(
  pgDump,
  [
    "--schema=public",
    "--no-owner",
    "--no-privileges",
    "--file",
    outFile,
    url.toString(),
  ],
  { stdio: "inherit", env: { ...process.env, PGSSLMODE: "require" } },
);

if (res.status !== 0) {
  console.error("\n✗ Backup falhou.");
  process.exit(res.status ?? 1);
}
console.log("\n✓ Backup concluído.");
