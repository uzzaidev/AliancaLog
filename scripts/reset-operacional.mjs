// ════════════════════════════════════════════════════════════════════════════
// Reset dos DADOS OPERACIONAIS — para recomeçar uma rodada de testes do zero.
//
//   node --env-file-if-exists=.env.local --env-file-if-exists=.env \
//        scripts/reset-operacional.mjs [--confirmar] [--fotos]
//
// Sem `--confirmar` ele só CONTA e faz backup (dry-run) — nada é apagado.
//
// APAGA (dados de movimento):
//   notas_fiscais  → cascateia canhotos e ocorrencias (FK on delete cascade)
//   romaneios
//   [--fotos] arquivos do bucket `canhotos` no Storage
//
// PRESERVA (cadastro):
//   empresas_clientes · usuarios · motoristas · veiculos · logins do Auth
//   schema_migrations · import_batches
//
// Usa a service role key (mesma via do seed) porque o RLS impediria apagar em
// massa — e porque o DATABASE_URL/pg está com a senha desatualizada.
// ════════════════════════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const APAGAR = process.argv.includes("--confirmar");
const LIMPAR_FOTOS = process.argv.includes("--fotos");
const BUCKET = "canhotos";

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function contar(tabela) {
  const { count, error } = await db
    .from(tabela)
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(`contar ${tabela}: ${error.message}`);
  return count ?? 0;
}

/** Lista recursiva do bucket — o path é {motorista}/{nf}/{client_id}.jpg. */
async function listarFotos(prefixo = "") {
  const { data, error } = await db.storage
    .from(BUCKET)
    .list(prefixo, { limit: 1000 });
  if (error) throw new Error(`storage.list("${prefixo}"): ${error.message}`);

  const arquivos = [];
  for (const item of data ?? []) {
    const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
    // Pasta não tem metadata; arquivo tem.
    if (item.id === null || item.metadata === null) {
      arquivos.push(...(await listarFotos(caminho)));
    } else {
      arquivos.push(caminho);
    }
  }
  return arquivos;
}

async function backup(tabelas) {
  const dir = path.join(process.cwd(), "backups");
  await mkdir(dir, { recursive: true });
  const carimbo = new Date().toISOString().replace(/[:.]/g, "-");
  const destino = path.join(dir, `reset-operacional-${carimbo}.json`);

  const dump = {};
  for (const t of tabelas) {
    const { data, error } = await db.from(t).select("*");
    if (error) throw new Error(`backup ${t}: ${error.message}`);
    dump[t] = data ?? [];
  }
  await writeFile(destino, JSON.stringify(dump, null, 2), "utf8");
  return { destino, dump };
}

async function main() {
  const tabelas = ["notas_fiscais", "canhotos", "ocorrencias", "romaneios"];

  console.log("── Estado atual ─────────────────────────────");
  const antes = {};
  for (const t of tabelas) {
    antes[t] = await contar(t);
    console.log(`  ${t.padEnd(16)} ${String(antes[t]).padStart(5)}`);
  }

  const preservadas = ["empresas_clientes", "usuarios", "motoristas", "veiculos"];
  console.log("\n── Preservado (cadastro) ────────────────────");
  for (const t of preservadas) {
    console.log(`  ${t.padEnd(18)} ${String(await contar(t)).padStart(5)}`);
  }

  let fotos = [];
  try {
    fotos = await listarFotos();
    console.log(`\n  fotos no Storage: ${fotos.length}`);
  } catch (e) {
    console.log(`\n  (não consegui listar o Storage: ${e.message})`);
  }

  const totalMovimento = tabelas.reduce((s, t) => s + antes[t], 0);
  if (totalMovimento === 0 && fotos.length === 0) {
    console.log("\n✅ Já está zerado. Nada a fazer.");
    return;
  }

  // Backup sempre — inclusive no dry-run. É a única rede de proteção, já que o
  // `npm run db:backup` (pg/DATABASE_URL) está fora do ar.
  const { destino } = await backup(tabelas);
  console.log(`\n💾 Backup salvo: ${path.relative(process.cwd(), destino)}`);

  if (!APAGAR) {
    console.log(
      "\n🔎 DRY-RUN — nada foi apagado.\n" +
        "   Para apagar de verdade, rode de novo com --confirmar" +
        (fotos.length > 0 ? " (e --fotos para limpar o Storage)." : "."),
    );
    return;
  }

  console.log("\n── Apagando ─────────────────────────────────");

  // notas_fiscais primeiro: cascateia canhotos e ocorrencias.
  const { error: errNf } = await db
    .from("notas_fiscais")
    .delete()
    .not("id", "is", null);
  if (errNf) throw new Error(`apagar notas_fiscais: ${errNf.message}`);
  console.log("  notas_fiscais (+ canhotos e ocorrencias em cascata) ✔");

  const { error: errRom } = await db
    .from("romaneios")
    .delete()
    .not("id", "is", null);
  if (errRom) throw new Error(`apagar romaneios: ${errRom.message}`);
  console.log("  romaneios ✔");

  if (LIMPAR_FOTOS && fotos.length > 0) {
    // Storage aceita no máximo ~1000 por chamada.
    for (let i = 0; i < fotos.length; i += 500) {
      const lote = fotos.slice(i, i + 500);
      const { error } = await db.storage.from(BUCKET).remove(lote);
      if (error) throw new Error(`remover fotos: ${error.message}`);
    }
    console.log(`  ${fotos.length} foto(s) do Storage ✔`);
  } else if (fotos.length > 0) {
    console.log(`  (${fotos.length} foto(s) mantidas — use --fotos para limpar)`);
  }

  console.log("\n── Depois ───────────────────────────────────");
  for (const t of tabelas) {
    console.log(`  ${t.padEnd(16)} ${String(await contar(t)).padStart(5)}`);
  }
  console.log("\n✅ Dados operacionais zerados. Cadastros e logins intactos.");
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
