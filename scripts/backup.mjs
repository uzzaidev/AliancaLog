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
import { homedir } from "node:os";
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

// Localiza o pg_dump de MAIOR versão (ele recusa dumpar um servidor mais novo
// que ele). Varre Program Files e o scoop, e compara as versões de fato.
function pgDumpMajor(exe) {
  try {
    const out = execFileSync(exe, ["--version"], { encoding: "utf8" });
    const m = out.match(/(\d+)\.\d+/);
    return m ? Number(m[1]) : 0;
  } catch {
    return 0;
  }
}
function findPgDump() {
  const candidates = [
    ...["18", "17", "16", "15"].map(
      (v) => `C:\\Program Files\\PostgreSQL\\${v}\\bin\\pg_dump.exe`,
    ),
    path.join(homedir(), "scoop", "apps", "postgresql", "current", "bin", "pg_dump.exe"),
    path.join(homedir(), "scoop", "shims", "pg_dump.exe"),
    "pg_dump", // fallback: deixa o PATH resolver
  ];
  let best = null;
  let bestMajor = 0;
  for (const exe of candidates) {
    if (exe !== "pg_dump" && !fs.existsSync(exe)) continue;
    const major = pgDumpMajor(exe);
    if (major > bestMajor) {
      bestMajor = major;
      best = exe;
    }
  }
  return best ?? "pg_dump";
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
