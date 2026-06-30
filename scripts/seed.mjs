// ════════════════════════════════════════════════════════════════════════════
// Seed de dados fictícios do Aliança Log (demonstração).
// Cria logins dos 3 perfis, empresas, motoristas e um romaneio de exemplo.
// Idempotente: pode rodar várias vezes sem duplicar.
//
//   npm run seed      (usa node --env-file=.env.local)
//
// Requer no .env.local: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
// ════════════════════════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SENHA_PADRAO = "alianca123";
const hoje = new Date().toISOString().slice(0, 10);

async function getOrCreateEmpresa(nome, cnpj) {
  const { data: found } = await db
    .from("empresas_clientes")
    .select("id")
    .eq("nome", nome)
    .maybeSingle();
  if (found) return found.id;
  const { data, error } = await db
    .from("empresas_clientes")
    .insert({ nome, cnpj })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function getOrCreateUser({ email, role, empresaId, nome }) {
  const appMeta = { role, ...(empresaId ? { empresa_id: empresaId } : {}) };

  const { data: list, error: listErr } = await db.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email === email);

  let id;
  if (existing) {
    id = existing.id;
    await db.auth.admin.updateUserById(id, {
      app_metadata: appMeta,
      user_metadata: { nome },
    });
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password: SENHA_PADRAO,
      email_confirm: true,
      app_metadata: appMeta,
      user_metadata: { nome },
    });
    if (error) throw error;
    id = data.user.id;
  }

  const { error: upErr } = await db
    .from("usuarios")
    .upsert({ id, nome, email, role, empresa_id: empresaId ?? null });
  if (upErr) throw upErr;
  return id;
}

async function main() {
  console.log("→ Empresas embarcadoras…");
  const leite = await getOrCreateEmpresa("Leite Travizão", "01.234.567/0001-10");
  const aurora = await getOrCreateEmpresa("Aurora Alimentos", "02.345.678/0001-20");

  console.log("→ Veículo…");
  const { data: veic } = await db
    .from("veiculos")
    .upsert({ placa: "IVV1A23", tipo: "Fiorino" }, { onConflict: "placa" })
    .select("id")
    .single();

  console.log("→ Usuários (gerência, motoristas, clientes)…");
  await getOrCreateUser({
    email: "gerencia@rotta.com.br",
    role: "gerencia",
    nome: "Matheus Rotta",
  });
  const joaoId = await getOrCreateUser({
    email: "joao@rotta.com.br",
    role: "motorista",
    nome: "João Motorista",
  });
  await getOrCreateUser({
    email: "carlos@rotta.com.br",
    role: "motorista",
    nome: "Carlos Motorista",
  });
  await getOrCreateUser({
    email: "acesso@leitetravizao.com.br",
    role: "cliente_final",
    empresaId: leite,
    nome: "Leite Travizão",
  });
  await getOrCreateUser({
    email: "acesso@aurora.com.br",
    role: "cliente_final",
    empresaId: aurora,
    nome: "Aurora Alimentos",
  });

  // Motoristas (extensão do usuário)
  await db
    .from("motoristas")
    .upsert({ id: joaoId, telefone: "(54) 99999-0001", veiculo_id: veic.id });

  console.log("→ Romaneio de exemplo (hoje)…");
  const { data: romExist } = await db
    .from("romaneios")
    .select("id")
    .eq("motorista_id", joaoId)
    .eq("data", hoje)
    .maybeSingle();

  if (romExist) {
    console.log("  (já existe romaneio de hoje para o João — pulando NFs)");
  } else {
    const { data: rom, error: romErr } = await db
      .from("romaneios")
      .insert({
        data: hoje,
        motorista_id: joaoId,
        veiculo_id: veic.id,
        status: "ativo",
        confirmado_em: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (romErr) throw romErr;

    const nfs = [
      { numero_nf: "12345", empresa_cliente_id: leite, destinatario_nome: "Mercado Central", destinatario_endereco: "Rua Os Dezoito do Forte, 1200", cidade: "Caxias do Sul", status: "aceita", entregue_em: new Date().toISOString() },
      { numero_nf: "12346", empresa_cliente_id: aurora, destinatario_nome: "Padaria Bella Vista", destinatario_endereco: "Av. Borges de Medeiros, 540", cidade: "Gramado", status: "em_rota" },
      { numero_nf: "12347", empresa_cliente_id: leite, destinatario_nome: "Restaurante Serra", destinatario_endereco: "Rua Coberta, 88", cidade: "Canela", status: "ocorrencia", observacao: "Faltou 2 caixas do produto X" },
      { numero_nf: "12348", empresa_cliente_id: aurora, destinatario_nome: "Hotel Cascata", destinatario_endereco: "Rua das Hortênsias, 3700", cidade: "Gramado", status: "pendente" },
      { numero_nf: "12349", empresa_cliente_id: leite, destinatario_nome: "Empório Colonial", destinatario_endereco: "Rua Augusto Pestana, 210", cidade: "Bento Gonçalves", status: "recusada" },
    ];

    for (let i = 0; i < nfs.length; i++) {
      const nf = nfs[i];
      const { data: nfRow, error: nfErr } = await db
        .from("notas_fiscais")
        .insert({
          ...nf,
          romaneio_id: rom.id,
          motorista_id: joaoId,
          data_entrega: hoje,
          ordem: i + 1,
        })
        .select("id")
        .single();
      if (nfErr) throw nfErr;

      if (nf.status === "ocorrencia") {
        await db.from("ocorrencias").insert({
          nota_fiscal_id: nfRow.id,
          tipo: "item_faltando",
          descricao: nf.observacao,
        });
      }
    }
    console.log(`  ${nfs.length} NFs criadas no romaneio.`);
  }

  console.log("\n✓ Seed concluído.");
  console.log("\nLogins (senha: " + SENHA_PADRAO + "):");
  console.log("  Gerência : gerencia@rotta.com.br");
  console.log("  Motorista: joao@rotta.com.br");
  console.log("  Cliente  : acesso@leitetravizao.com.br");
}

main().catch((err) => {
  console.error("Erro no seed:", err.message ?? err);
  process.exit(1);
});
