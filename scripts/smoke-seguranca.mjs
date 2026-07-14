// Smoke test de segurança/confiabilidade (Sprint 3.5 — migrations 0008/0009).
// Valida, contra o banco REAL e com a sessão real do motorista (RLS aplicado):
//   - imutabilidade da NF finalizada + whitelist de colunas do motorista;
//   - no máximo 1 canhoto por NF;
//   - canhoto só na própria NF (RLS);
//   - romaneio fechado não reabre;
//   - ocorrência idempotente por client_id.
//
//   node --env-file-if-exists=.env.local --env-file-if-exists=.env scripts/smoke-seguranca.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const name of [".env.local", ".env"]) {
  const f = path.join(ROOT, name);
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]/, "").replace(/['"]$/, "").trim();
  }
  break;
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, svc, { auth: { autoRefreshToken: false, persistSession: false } });

const hoje = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

let falhas = 0;
const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) falhas++; };
const tag = "SMK9-" + Date.now();
const criados = { canhotos: [], ocorrencias: [], nfs: [], romaneios: [] };

async function idPorEmail(email) {
  const { data } = await admin.from("usuarios").select("id").eq("email", email).maybeSingle();
  return data?.id ?? null;
}

async function main() {
  const joaoId = await idPorEmail("joao@rotta.com.br");
  const carlosId = await idPorEmail("carlos@rotta.com.br");
  const { data: leite } = await admin.from("empresas_clientes").select("id").eq("nome", "Leite Travizão").maybeSingle();
  if (!joaoId || !carlosId || !leite) { console.log("✗ pré-requisitos do seed ausentes (joao/carlos/Leite)"); process.exit(1); }
  // Carlos precisa existir em motoristas para poder ter NF (FK).
  await admin.from("motoristas").upsert({ id: carlosId });

  // ── setup ──
  const mkRomaneio = async (motorista, status) => {
    const { data, error } = await admin.from("romaneios")
      .insert({ data: hoje, motorista_id: motorista, status, confirmado_em: new Date().toISOString() })
      .select("id").single();
    if (error) throw error;
    criados.romaneios.push(data.id);
    return data.id;
  };
  const mkNf = async (motorista, romaneio, status) => {
    const { data, error } = await admin.from("notas_fiscais")
      .insert({ numero_nf: tag + "-" + Math.random().toString(36).slice(2, 6), empresa_cliente_id: leite.id,
        destinatario_nome: "Alvo", destinatario_endereco: "Rua X, 1", cidade: "Caxias do Sul",
        motorista_id: motorista, romaneio_id: romaneio, data_entrega: hoje, status })
      .select("id").single();
    if (error) throw error;
    criados.nfs.push(data.id);
    return data.id;
  };

  const romAtivo = await mkRomaneio(joaoId, "ativo");
  const romFechado = await mkRomaneio(joaoId, "fechado");
  const romCarlos = await mkRomaneio(carlosId, "ativo");
  const nfImut = await mkNf(joaoId, romAtivo, "em_rota");
  const nfCanhoto = await mkNf(joaoId, romAtivo, "em_rota");
  const nfOutro = await mkNf(carlosId, romCarlos, "em_rota");

  // ── sessão do motorista joao ──
  const cli = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error: authErr } = await cli.auth.signInWithPassword({ email: "joao@rotta.com.br", password: "alianca123" });
  if (authErr) { console.log("✗ login joao:", authErr.message); process.exit(1); }

  // Lê o estado real da NF (via admin, ignora RLS de leitura).
  const statusDe = async (id) => (await admin.from("notas_fiscais").select("status,destinatario_nome").eq("id", id).single()).data;

  // T1 — whitelist: motorista não altera destinatário (o VALOR não pode mudar)
  {
    await cli.from("notas_fiscais").update({ destinatario_nome: "HACK" }).eq("id", nfImut);
    const s = await statusDe(nfImut);
    ok(s.destinatario_nome === "Alvo", "T1 destinatário NÃO muda pelo motorista (é " + s.destinatario_nome + ")");
  }
  // T2 — status em_rota→aceita permitido (motorista finaliza)
  {
    await cli.from("notas_fiscais").update({ status: "aceita" }).eq("id", nfImut);
    const s = await statusDe(nfImut);
    ok(s.status === "aceita", "T2 motorista finaliza NF (em_rota→aceita, ficou " + s.status + ")");
  }
  // T3 — imutável após final: aceita→recusada não pode mudar o valor
  {
    await cli.from("notas_fiscais").update({ status: "recusada" }).eq("id", nfImut);
    const s = await statusDe(nfImut);
    ok(s.status === "aceita", "T3 NF finalizada é imutável (segue " + s.status + ")");
  }
  // T4 — 1 canhoto por NF
  {
    const c1 = await cli.from("canhotos").insert({ client_id: tag + "-c1", nota_fiscal_id: nfCanhoto, motorista_id: joaoId, status: "aceita", sincronizado: true });
    criados.canhotos.push(tag + "-c1");
    ok(!c1.error, "T4a 1º canhoto na própria NF em romaneio ativo" + (c1.error ? " — ERRO: " + c1.error.message : ""));
    const c2 = await cli.from("canhotos").insert({ client_id: tag + "-c2", nota_fiscal_id: nfCanhoto, motorista_id: joaoId, status: "recusada", sincronizado: true });
    ok(!!c2.error, "T4b 2º canhoto na MESMA NF é bloqueado" + (c2.error ? "" : " — FALHA: duplicou"));
  }
  // T5 — canhoto só na própria NF
  {
    const { error } = await cli.from("canhotos").insert({ client_id: tag + "-c3", nota_fiscal_id: nfOutro, motorista_id: joaoId, status: "aceita", sincronizado: true });
    ok(!!error, "T5 motorista NÃO registra canhoto em NF de outro" + (error ? "" : " — FALHA: registrou"));
  }
  // T6 — romaneio fechado não reabre
  {
    await cli.from("romaneios").update({ status: "ativo" }).eq("id", romFechado);
    const { data } = await admin.from("romaneios").select("status").eq("id", romFechado).single();
    ok(data.status === "fechado", "T6 romaneio fechado não reabre pelo motorista (segue " + data.status + ")");
  }
  // T7 — ocorrência idempotente por client_id (via admin, simula reenvio)
  {
    const base = { nota_fiscal_id: nfImut, tipo: "avaria", descricao: "x", client_id: tag + "-oc" };
    criados.ocorrencias.push(tag + "-oc");
    const o1 = await admin.from("ocorrencias").insert(base);
    const o2 = await admin.from("ocorrencias").insert(base);
    ok(!o1.error && !!o2.error, "T7 ocorrência não duplica no reenvio (mesmo client_id)" + (o2.error ? "" : " — FALHA: duplicou"));
  }

  // ── teardown ──
  await admin.from("canhotos").delete().in("client_id", criados.canhotos);
  await admin.from("ocorrencias").delete().in("client_id", criados.ocorrencias);
  await admin.from("notas_fiscais").delete().in("id", criados.nfs);
  await admin.from("romaneios").delete().in("id", criados.romaneios);

  console.log("\n" + (falhas === 0 ? "✓✓✓ SEGURANÇA OK — todos os controles ativos" : `✗ ${falhas} falha(s)`));
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((e) => { console.error("Erro:", e.message ?? e); process.exit(1); });
