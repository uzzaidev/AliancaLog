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

/**
 * Afirma que uma consulta RODOU e não devolveu nada — o jeito correto de testar
 * bloqueio por RLS, que filtra em silêncio (lista vazia, sem erro).
 *
 * Existe porque `const { data } = await ...; ok(!data?.length)` PASSA quando a
 * consulta falha (data vira null). Isso transforma erro de infraestrutura em
 * "teste verde" — a mesma classe de falsa confiança que o T7 antigo tinha.
 */
const naoVeNada = ({ data, error }, msg) => {
  if (error) return ok(false, msg + " — NÃO VERIFICADO: a consulta falhou (" + error.message + ")");
  return ok(Array.isArray(data) && data.length === 0, msg + (data?.length ? " — FALHA: VAZOU" : ""));
};
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
  const mkNf = async (motorista, romaneio, status, empresa = leite.id) => {
    const { data, error } = await admin.from("notas_fiscais")
      .insert({ numero_nf: tag + "-" + Math.random().toString(36).slice(2, 6), empresa_cliente_id: empresa,
        destinatario_nome: "Alvo", destinatario_endereco: "Rua X, 1", cidade: "Caxias do Sul",
        motorista_id: motorista, romaneio_id: romaneio, data_entrega: hoje, status })
      .select("id").single();
    if (error) throw error;
    criados.nfs.push(data.id);
    return data.id;
  };

  /** Faz login e devolve o client; null se o usuário não existir no ambiente. */
  const entrarComo = async (email, senha = "alianca123") => {
    const c = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
    const { error } = await c.auth.signInWithPassword({ email, password: senha });
    return error ? null : c;
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
  // T7 — RETRY da fila offline: reenviar o MESMO client_id pela RPC é no-op.
  //
  // Antes este teste inseria em `ocorrencias` com o cliente `admin`, que IGNORA
  // RLS — ou seja, exercitava só o índice único, nunca o caminho real do app.
  // Foi essa cegueira que deixou passar o bug de 27/08 (ver T8). Agora usa a
  // sessão do motorista e a própria RPC, que é o que a fila chama.
  //
  // Esta é A garantia de que o offline depende: quando o celular reenvia por
  // falta de confirmação, o servidor não pode duplicar nada.
  {
    const nfRetry = await mkNf(joaoId, romAtivo, "em_rota");
    const cid = tag + "-retry";
    criados.canhotos.push(cid);
    criados.ocorrencias.push(cid);
    const params = {
      p_client_id: cid,
      p_nota_fiscal_id: nfRetry,
      p_status: "ocorrencia",
      p_foto_url: "smoke/canhoto.jpg",
      p_foto_chegada_url: "smoke/chegada.jpg",
      p_lat: null, p_lng: null, p_gps_precisao: null,
      p_observacao: null,
      p_ocorrencia_tipo: "avaria",
      p_ocorrencia_desc: "smoke retry",
    };

    const r1 = await cli.rpc("registrar_entrega_offline", params);
    ok(!r1.error && r1.data?.[0]?.ja_existia === false,
      "T7a 1º envio grava a tentativa" + (r1.error ? " — ERRO: " + r1.error.message : ""));

    const r2 = await cli.rpc("registrar_entrega_offline", params);
    ok(!r2.error && r2.data?.[0]?.ja_existia === true,
      "T7b reenvio do MESMO client_id é no-op (ja_existia)" + (r2.error ? " — ERRO: " + r2.error.message : ""));

    const { count: nOc } = await admin.from("ocorrencias")
      .select("id", { count: "exact", head: true }).eq("client_id", cid);
    const { count: nCa } = await admin.from("canhotos")
      .select("id", { count: "exact", head: true }).eq("client_id", cid);
    ok(nOc === 1 && nCa === 1,
      `T7c retry não duplicou (canhotos=${nCa}, ocorrencias=${nOc}, esperado 1 e 1)`);
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
    const outro = await entrarComo("carlos@rotta.com.br");
    if (!outro) {
      ok(false, "T8d NÃO VERIFICADO — login do carlos indisponível");
    } else {
      naoVeNada(
        await outro.from("notas_fiscais").select("id").eq("id", nfOc),
        "T8d outro motorista NÃO vê NF solta",
      );
      // Caso básico que faltava: NF atribuída a OUTRO motorista.
      naoVeNada(
        await outro.from("notas_fiscais").select("id").eq("id", nfCanhoto),
        "T8e motorista NÃO vê NF de outro motorista",
      );
    }
  }

  // ── T9 — CONFIRMAÇÃO ATÔMICA DO ROMANEIO ──
  {
    const romConfirmacao = await mkRomaneio(joaoId, "ativo");
    const nfConfirmacao = await mkNf(joaoId, romConfirmacao, "pendente");
    await admin.from("romaneios").update({ confirmado_em: null }).eq("id", romConfirmacao);

    const { error } = await cli.rpc("confirmar_romaneio_motorista", {
      p_romaneio_id: romConfirmacao,
    });
    const { data: romDepois } = await admin
      .from("romaneios").select("confirmado_em").eq("id", romConfirmacao).single();
    const { data: nfDepois } = await admin
      .from("notas_fiscais").select("status").eq("id", nfConfirmacao).single();
    ok(
      !error && romDepois?.confirmado_em && nfDepois?.status === "em_rota",
      "T9 confirmação atômica atualiza romaneio e NFs" + (error ? " — ERRO: " + error.message : ""),
    );
  }

  // ── T10 — ISOLAMENTO ENTRE EMPRESAS (risco R-008) ──
  // O risco mais grave registrado no PLAN.md: cliente final enxergar dado de
  // outra empresa. Até 27/08 NÃO havia teste automatizado disso — o CHECKLIST
  // pedia explicitamente ("cliente A não vê NF da empresa B") e o critério estava
  // sendo dado como coberto só porque a policy existia.
  {
    const { data: outraEmp } = await admin.from("empresas_clientes")
      .select("id,nome").neq("id", leite.id).limit(1).maybeSingle();
    const { data: donoOutra } = outraEmp
      ? await admin.from("usuarios").select("email")
          .eq("role", "cliente_final").eq("empresa_id", outraEmp.id).maybeSingle()
      : { data: null };

    if (!outraEmp || !donoOutra) {
      ok(false, "T10 NÃO VERIFICADO — o ambiente não tem duas empresas com login de cliente");
    } else {
      // Uma NF de cada empresa, ambas soltas (sem motorista/romaneio).
      const nfLeite = await mkNf(null, null, "pendente", leite.id);
      const nfOutraEmp = await mkNf(null, null, "pendente", outraEmp.id);

      const cliLeite = await entrarComo("acesso@leitetravizao.com.br");
      if (!cliLeite) {
        ok(false, "T10 NÃO VERIFICADO — login do cliente Leite Travizão indisponível");
      } else {
        // Positivo primeiro: prova que a consulta do cliente FUNCIONA. Sem isto,
        // um T9b verde não distinguiria "RLS bloqueou" de "consulta quebrada".
        const { data: propria, error: ePropria } = await cliLeite
          .from("notas_fiscais").select("id").eq("id", nfLeite);
        ok(!ePropria && propria?.length === 1,
          "T10a cliente vê a NF da própria empresa" + (ePropria ? " — ERRO: " + ePropria.message : ""));

        naoVeNada(
          await cliLeite.from("notas_fiscais").select("id").eq("id", nfOutraEmp),
          `T10b cliente NÃO vê NF de outra empresa (${outraEmp.nome})`,
        );

        // Não pode nem inserir NF em nome de outra empresa (cli_nf_insert).
        const { error: eIns } = await cliLeite.from("notas_fiscais").insert({
          numero_nf: tag + "-hack", empresa_cliente_id: outraEmp.id,
          destinatario_nome: "Hack", destinatario_endereco: "Rua Y, 2",
          data_entrega: hoje, status: "pendente",
        });
        ok(!!eIns, "T10c cliente NÃO cria NF para outra empresa" + (eIns ? "" : " — FALHA: criou"));
        if (!eIns) {
          const { data: lixo } = await admin.from("notas_fiscais")
            .select("id").eq("numero_nf", tag + "-hack");
          for (const l of lixo ?? []) criados.nfs.push(l.id);
        }

        // Ocorrência registrada numa NF da OUTRA empresa não pode vazar.
        // (A ocorrência do T7 é de NF da própria Leite, então serviria de falso
        //  negativo — por isso criamos uma na empresa alheia, de propósito.)
        const cidAlheio = tag + "-oc-alheia";
        criados.ocorrencias.push(cidAlheio);
        await admin.from("ocorrencias").insert({
          nota_fiscal_id: nfOutraEmp, tipo: "avaria", descricao: "de outra empresa",
          client_id: cidAlheio,
        });
        naoVeNada(
          await cliLeite.from("ocorrencias").select("id").eq("client_id", cidAlheio),
          "T10d cliente NÃO vê ocorrência de NF de outra empresa",
        );
      }
    }
  }

  console.log("\n" + (falhas === 0 ? "✓✓✓ SEGURANÇA OK — todos os controles ativos" : `✗ ${falhas} falha(s)`));
  return falhas;
}

/**
 * Remove tudo que o teste criou. Fica FORA do main e roda em `finally` porque
 * este script escreve no banco REAL: se um teste estourar no meio, o teardown
 * inline não rodava e sobravam NFs/romaneios de teste em produção, poluindo o
 * painel da gerência com notas "SMK9-…".
 */
async function limpar() {
  try {
    if (criados.canhotos.length)
      await admin.from("canhotos").delete().in("client_id", criados.canhotos);
    if (criados.ocorrencias.length)
      await admin.from("ocorrencias").delete().in("client_id", criados.ocorrencias);
    if (criados.nfs.length)
      await admin.from("notas_fiscais").delete().in("id", criados.nfs);
    if (criados.romaneios.length)
      await admin.from("romaneios").delete().in("id", criados.romaneios);
  } catch (e) {
    console.error("⚠ limpeza incompleta:", e.message ?? e);
    console.error("  registros com a tag", tag, "podem ter ficado no banco.");
  }
}

let saida = 1;
try {
  saida = (await main()) === 0 ? 0 : 1;
} catch (e) {
  console.error("Erro:", e.message ?? e);
} finally {
  await limpar();
}
process.exit(saida);
