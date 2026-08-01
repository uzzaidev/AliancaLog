// Regenera supabase/setup.sql concatenando supabase/migrations/*.sql em ordem.
// setup.sql é só a conveniência de colar um schema completo no SQL Editor num
// banco zerado — supabase/migrations/ + `npm run db:migrate` continua sendo a
// fonte de verdade. Rode isto sempre que adicionar uma migration nova.
//
//   node scripts/gen-setup-sql.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const OUT_FILE = path.join(ROOT, "supabase", "setup.sql");

const arquivos = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const header = `-- ════════════════════════════════════════════════════════════════════════════
-- Aliança Log — Schema completo (auto-gerado)
--
-- ARQUIVO GERADO — não edite diretamente. Gerado por scripts/gen-setup-sql.mjs
-- a partir de supabase/migrations/*.sql (fonte de verdade real do banco).
-- Regenere com \`node scripts/gen-setup-sql.mjs\` sempre que houver migration nova.
--
-- Uso: colar inteiro no SQL Editor do Supabase para montar o schema completo
-- em um banco ZERADO (ambiente novo de dev/staging). Em um banco que já rodou
-- migrations antes, use \`npm run db:migrate\`, não este arquivo.
-- ════════════════════════════════════════════════════════════════════════════

`;

const corpo = arquivos
  .map((f) => {
    const conteudo = fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8").trimEnd();
    return `-- ─── ${f} ───────────────────────────────────────────────────────────\n${conteudo}\n`;
  })
  .join("\n");

fs.writeFileSync(OUT_FILE, header + corpo + "\n");
console.log(`supabase/setup.sql regenerado a partir de ${arquivos.length} migrations.`);
