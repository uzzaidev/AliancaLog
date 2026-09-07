// ════════════════════════════════════════════════════════════════════════════
// Importação em lote de usuários reais para o piloto do Aliança Log.
// Suporta motoristas (com veículo opcional) e empresas clientes (com acesso ao portal).
// Idempotente: pode ser executado repetidas vezes com segurança.
//
// Como rodar:
//   npm run importar:piloto
// Ou passando caminhos específicos:
//   node --env-file-if-exists=.env.local scripts/importar-usuarios-piloto.mjs \
//     --motoristas=./scripts/dados/motoristas.csv \
//     --empresas=./scripts/dados/empresas.csv
// ════════════════════════════════════════════════════════════════════════════
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SENHA_PADRAO_MOTORISTA = "rotta@2026";
const SENHA_PADRAO_CLIENTE = "cliente@2026";

const DIR_DADOS = resolve(process.cwd(), "scripts", "dados");

// Gera templates de exemplo se não existirem
function garantirTemplates() {
  const tplMotoristas = join(DIR_DADOS, "motoristas.template.csv");
  const tplEmpresas = join(DIR_DADOS, "empresas.template.csv");

  if (!existsSync(tplMotoristas)) {
    const conteudo = [
      "nome,email,senha,telefone,placa,tipo_veiculo",
      "Marcos Silva,marcos.silva@rottalog.com.br,rotta@2026,54999990001,IVV1A23,Fiorino",
      "Roberto Andrade,roberto.andrade@rottalog.com.br,rotta@2026,54999990002,JAA2B34,Van Master",
      "Antonio Carlos,antonio.carlos@rottalog.com.br,rotta@2026,54999990003,KBB3C45,Caminhão 3/4",
    ].join("\n");
    writeFileSync(tplMotoristas, conteudo, "utf8");
    console.log(`📄 Template criado: ${tplMotoristas}`);
  }

  if (!existsSync(tplEmpresas)) {
    const conteudo = [
      "nome,cnpj,email,senha",
      "Aurora Alimentos S.A.,02.345.678/0001-20,portal@aurora.com.br,cliente@2026",
      "Leite Travizão Indústria,01.234.567/0001-10,acesso@leitetravizao.com.br,cliente@2026",
      "Distribuidora Serra Ltda,03.456.789/0001-30,logistica@distribuidoraserrars.com.br,cliente@2026",
    ].join("\n");
    writeFileSync(tplEmpresas, conteudo, "utf8");
    console.log(`📄 Template criado: ${tplEmpresas}`);
  }
}

// Parser simples e tolerante a CSV (com ou sem aspas)
function parseCSV(content) {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(",");
    const row = {};
    headers.forEach((h, idx) => {
      let val = rawCols[idx] ? rawCols[idx].trim().replace(/^["']|["']$/g, "") : "";
      row[h] = val;
    });
    rows.push(row);
  }
  return rows;
}

// Obtém ou cria usuário no Auth e tabela usuarios
async function upsertAuthUser({ email, password, role, nome, empresaId }) {
  const appMeta = { role, ...(empresaId ? { empresa_id: empresaId } : {}) };
  const userMeta = { nome };

  const { data: list, error: listErr } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;

  const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  let userId;
  if (existing) {
    userId = existing.id;
    const updatePayload = {
      app_metadata: appMeta,
      user_metadata: userMeta,
    };
    if (password) updatePayload.password = password;
    const { error: updErr } = await db.auth.admin.updateUserById(userId, updatePayload);
    if (updErr) throw updErr;
  } else {
    const { data: created, error: crtErr } = await db.auth.admin.createUser({
      email,
      password: password || SENHA_PADRAO_MOTORISTA,
      email_confirm: true,
      app_metadata: appMeta,
      user_metadata: userMeta,
    });
    if (crtErr) throw crtErr;
    userId = created.user.id;
  }

  // Sincroniza tabela usuarios
  const { error: upsertErr } = await db.from("usuarios").upsert(
    {
      id: userId,
      nome,
      email: email.toLowerCase(),
      role,
      empresa_id: empresaId || null,
      ativo: true,
    },
    { onConflict: "id" },
  );
  if (upsertErr) throw upsertErr;

  return { userId, isNew: !existing };
}

async function importarMotoristas(caminhoArquivo) {
  if (!existsSync(caminhoArquivo)) {
    console.log(`⚠️ Arquivo de motoristas não encontrado em: ${caminhoArquivo}`);
    return;
  }

  const raw = readFileSync(caminhoArquivo, "utf8");
  const registros = parseCSV(raw);

  console.log(`\n🚚 Iniciando importação de ${registros.length} motorista(s)...`);
  let sucessos = 0;
  let erros = 0;

  for (const reg of registros) {
    const nome = reg.nome;
    const email = reg.email;
    const senha = reg.senha || SENHA_PADRAO_MOTORISTA;
    const telefone = reg.telefone || null;
    const placa = reg.placa ? reg.placa.toUpperCase().trim() : null;
    const tipoVeiculo = reg.tipo_veiculo || null;

    if (!nome || !email) {
      console.warn(`  ⚠️ Ignorando linha com nome ou email em branco: ${JSON.stringify(reg)}`);
      erros++;
      continue;
    }

    try {
      // 1. Veículo (opcional)
      let veiculoId = null;
      if (placa) {
        const { data: veic, error: vErr } = await db
          .from("veiculos")
          .upsert({ placa, tipo: tipoVeiculo }, { onConflict: "placa" })
          .select("id")
          .single();
        if (vErr) throw vErr;
        veiculoId = veic.id;
      }

      // 2. Auth + Usuário
      const { userId, isNew } = await upsertAuthUser({
        email,
        password: senha,
        role: "motorista",
        nome,
      });

      // 3. Tabela Motoristas
      const { error: mErr } = await db.from("motoristas").upsert(
        {
          id: userId,
          telefone,
          veiculo_id: veiculoId,
        },
        { onConflict: "id" },
      );
      if (mErr) throw mErr;

      console.log(`  ✅ [${isNew ? "NOVO" : "ATUALIZADO"}] Motorista: ${nome} (${email}) - Veículo: ${placa || "Nenhum"}`);
      sucessos++;
    } catch (err) {
      console.error(`  ❌ Erro ao cadastrar motorista ${nome} (${email}):`, err.message);
      erros++;
    }
  }

  console.log(`🏁 Motoristas: ${sucessos} processado(s) com sucesso, ${erros} erro(s).`);
}

async function importarEmpresas(caminhoArquivo) {
  if (!existsSync(caminhoArquivo)) {
    console.log(`⚠️ Arquivo de empresas não encontrado em: ${caminhoArquivo}`);
    return;
  }

  const raw = readFileSync(caminhoArquivo, "utf8");
  const registros = parseCSV(raw);

  console.log(`\n🏢 Iniciando importação de ${registros.length} empresa(s)...`);
  let sucessos = 0;
  let erros = 0;

  for (const reg of registros) {
    const nome = reg.nome;
    const cnpj = reg.cnpj || null;
    const email = reg.email ? reg.email.trim() : null;
    const senha = reg.senha || SENHA_PADRAO_CLIENTE;

    if (!nome) {
      console.warn(`  ⚠️ Ignorando linha sem nome de empresa: ${JSON.stringify(reg)}`);
      erros++;
      continue;
    }

    try {
      // 1. Tabela empresas_clientes
      let empresaId;
      const { data: existente } = await db
        .from("empresas_clientes")
        .select("id")
        .eq("nome", nome)
        .maybeSingle();

      if (existente) {
        empresaId = existente.id;
        if (cnpj) {
          await db.from("empresas_clientes").update({ cnpj }).eq("id", empresaId);
        }
      } else {
        const { data: criada, error: cErr } = await db
          .from("empresas_clientes")
          .insert({ nome, cnpj })
          .select("id")
          .single();
        if (cErr) throw cErr;
        empresaId = criada.id;
      }

      // 2. Login do portal do cliente (se email fornecido)
      let infoLogin = "Sem login no portal";
      if (email) {
        const { isNew } = await upsertAuthUser({
          email,
          password: senha,
          role: "cliente_final",
          nome,
          empresaId,
        });
        infoLogin = `Login ${isNew ? "criado" : "atualizado"}: ${email}`;
      }

      console.log(`  ✅ Empresa: ${nome} (CNPJ: ${cnpj || "N/A"}) - ${infoLogin}`);
      sucessos++;
    } catch (err) {
      console.error(`  ❌ Erro ao cadastrar empresa ${nome}:`, err.message);
      erros++;
    }
  }

  console.log(`🏁 Empresas: ${sucessos} processada(s) com sucesso, ${erros} erro(s).`);
}

async function main() {
  garantirTemplates();

  // Argumentos da linha de comando ou padrões
  const args = process.argv.slice(2);
  const argMotoristas = args.find((a) => a.startsWith("--motoristas="))?.split("=")[1];
  const argEmpresas = args.find((a) => a.startsWith("--empresas="))?.split("=")[1];

  const arqMotoristas = argMotoristas ? resolve(argMotoristas) : join(DIR_DADOS, "motoristas.csv");
  const arqEmpresas = argEmpresas ? resolve(argEmpresas) : join(DIR_DADOS, "empresas.csv");

  const temMotoristas = existsSync(arqMotoristas);
  const temEmpresas = existsSync(arqEmpresas);

  if (!temMotoristas && !temEmpresas) {
    console.log("\n📌 NENHUM ARQUIVO DE DADOS ENCONTRADO PARA IMPORTAR!");
    console.log("Para importar usuários em lote para o piloto, siga um dos passos:");
    console.log("  1. Preencha os arquivos em:");
    console.log(`     - ${join(DIR_DADOS, "motoristas.csv")}`);
    console.log(`     - ${join(DIR_DADOS, "empresas.csv")}`);
    console.log("     (Veja os arquivos .template.csv gerados na mesma pasta como referência)");
    console.log("  2. Ou passe o caminho de arquivos personalizados:");
    console.log("     npm run importar:piloto -- --motoristas=./minha-lista-mot.csv --empresas=./empresas.csv\n");
    return;
  }

  if (temMotoristas) {
    await importarMotoristas(arqMotoristas);
  }
  if (temEmpresas) {
    await importarEmpresas(arqEmpresas);
  }

  console.log("\n🎉 Processamento concluído com sucesso!");
}

main().catch((err) => {
  console.error("❌ Falha crítica na importação:", err);
  process.exit(1);
});

