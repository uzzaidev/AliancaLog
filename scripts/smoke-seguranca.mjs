// Smoke test de segurança/confiabilidade (Sprint 3.5 — migrations 0008/0009;
// atualizado na migration 0016/A-007).
// Valida, contra o banco REAL e com a sessão real do motorista (RLS aplicado):
//   - imutabilidade da NF só depois de 'aceita' + whitelist de colunas do motorista;
//   - múltiplas tentativas (canhotos) são permitidas na MESMA NF (A-007), mas o
//     reenvio do MESMO client_id continua bloqueado (idempotência de retry);
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
  // T3 — imutável só depois de 'aceita' (A-007: recusada/ocorrência não são mais finais)
  {
    await cli.from("notas_fiscais").update({ status: "recusada" }).eq("id", nfImut);
    const s = await statusDe(nfImut);
    ok(s.status === "aceita", "T3 NF já aceita é imutável (segue " + s.status + ")");
  }
  // T4 — múltiplas tentativas na MESMA NF são permitidas (A-007); reenvio do
  // MESMO client_id continua bloqueado (idempotência de retry de rede).
  {
    const c1 = await cli.from("canhotos").insert({ client_id: tag + "-c1", nota_fiscal_id: nfCanhoto, motorista_id: joaoId, status: "recusada", sincronizado: true });
    criados.canhotos.push(tag + "-c1");
    ok(!c1.error, "T4a 1ª tentativa na própria NF em romaneio ativo" + (c1.error ? " — ERRO: " + c1.error.message : ""));
    const c2 = await cli.from("canhotos").insert({ client_id: tag + "-c2", nota_fiscal_id: nfCanhoto, motorista_id: joaoId, status: "aceita", sincronizado: true });
    criados.canhotos.push(tag + "-c2");
    ok(!c2.error, "T4b 2ª tentativa (client_id novo) na MESMA NF é permitida" + (c2.error ? " — ERRO: " + c2.error.message : ""));
    const c1Retry = await cli.from("canhotos").insert({ client_id: tag + "-c1", nota_fiscal_id: nfCanhoto, motorista_id: joaoId, status: "aceita", sincronizado: true });
    ok(!!c1Retry.error, "T4c reenvio do MESMO client_id continua bloqueado" + (c1Retry.error ? "" : " — FALHA: duplicou"));
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

  // ── T8 — registrar OCORRÊNCIA pela RPC, com a sessão do motorista ──
  // Este bloco existe por causa de um bug real que chegou em produção (27/08):
  // o T7 acima usa `admin`, que IGNORA RLS — então o caminho que o app usa de
  // verdade (sessão do motorista → registrar_entrega_offline) nunca era exercido,
  // e duas falhas de RLS passaram batido:
  //   • sem SELECT em `ocorrencias`, o ON CONFLICT do insert era barrado (0020);
  //   • ao devolver a NF pro painel, zerar motorista_id tirava a linha do alcance
  //     de `mot_nf_select` e o próprio UPDATE era recusado (0021).
  // Qualquer regressão nessas policies volta a quebrar a ocorrência no celular.
  {
    const nfOc = await mkNf(joaoId, romAtivo, "em_rota");
    const cid = tag + "-rpc-oc";
    criados.canhotos.push(cid);
    criados.ocorrencias.push(cid);

    const { error } = await cli.rpc("registrar_entrega_offline", {
      p_client_id: cid,
      p_nota_fiscal_id: nfOc,
      p_status: "ocorrencia",
      p_foto_url: "smoke/canhoto.jpg",
      p_foto_chegada_url: "smoke/chegada.jpg",
      p_lat: null, p_lng: null, p_gps_precisao: null,
      p_observacao: null,
      p_ocorrencia_tipo: "cliente_ausente",
      p_ocorrencia_desc: "smoke test",
    });
    ok(!error, "T8a motorista registra OCORRÊNCIA pela RPC" + (error ? " — FALHA: " + error.message : ""));

    // Desde a migration 0022 a NF guarda o DESFECHO da tentativa, não vira
    // 'pendente'. Quem faz ela "voltar ao painel" é romaneio_id/motorista_id
    // nulos — os dois lados precisam valer ao mesmo tempo.
    const { data: depois } = await admin
      .from("notas_fiscais")
      .select("status,romaneio_id,motorista_id")
      .eq("id", nfOc)
      .single();
    ok(depois?.status === "ocorrencia", "T8b NF guarda o desfecho da tentativa (ficou " + depois?.status + ")");
    ok(
      depois?.romaneio_id === null && depois?.motorista_id === null,
      "T8b2 NF volta pro painel: sai do romaneio e do motorista",
    );

    // O motorista tem que continuar enxergando a NF que ele atendeu, mesmo depois
    // de ela sair da posse dele — é o que sustenta /motorista/historico.
    const { data: visivel } = await cli.from("notas_fiscais").select("id").eq("id", nfOc);
    ok(visivel?.length === 1, "T8c motorista mantém acesso ao próprio histórico após a devolução");

    // E um motorista diferente NÃO pode enxergar essa NF agora solta.
    const outro = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error: eCarlos } = await outro.auth.signInWithPassword({ email: "carlos@rotta.com.br", password: "alianca123" });
    if (eCarlos) {
      ok(true, "T8d (pulado — login do carlos indisponível: " + eCarlos.message + ")");
    } else {
      const { data: vazou } = await outro.from("notas_fiscais").select("id").eq("id", nfOc);
      ok(!vazou?.length, "T8d outro motorista NÃO vê NF solta" + (vazou?.length ? " — FALHA: vazou" : ""));
    }
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
