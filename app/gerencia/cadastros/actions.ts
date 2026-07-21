"use server";

// Server Actions de cadastro (gerência). Criam logins via service role (admin)
// com o papel no app_metadata. Toda action confere que o chamador é gerência.
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = { ok?: string; error?: string } | undefined;

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function criarEmpresa(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireRole("gerencia");
  const nome = s(fd, "nome");
  const email = s(fd, "email");
  const senha = s(fd, "senha");
  if (!nome) return { error: "Informe o nome da empresa." };

  const admin = createAdminClient();
  const { data: emp, error } = await admin
    .from("empresas_clientes")
    .insert({ nome })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Cria o acesso do portal do cliente, se e-mail + senha foram informados.
  if (email && senha) {
    const { data: u, error: e2 } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      app_metadata: { role: "cliente_final", empresa_id: emp.id },
      user_metadata: { nome },
    });
    if (e2) return { error: `Empresa criada, mas o login falhou: ${e2.message}` };
    await admin.from("usuarios").insert({
      id: u.user.id,
      nome,
      email,
      role: "cliente_final",
      empresa_id: emp.id,
    });
  }

  revalidatePath("/gerencia/cadastros");
  return { ok: "Empresa cadastrada." };
}

export async function criarVeiculo(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireRole("gerencia");
  const placa = s(fd, "placa").toUpperCase();
  const tipo = s(fd, "tipo");
  if (!placa) return { error: "Informe a placa." };

  const admin = createAdminClient();
  const { error } = await admin.from("veiculos").insert({ placa, tipo: tipo || null });
  if (error) return { error: error.message };

  revalidatePath("/gerencia/cadastros");
  return { ok: "Veículo cadastrado." };
}

export async function criarMotorista(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireRole("gerencia");
  const nome = s(fd, "nome");
  const email = s(fd, "email");
  const senha = s(fd, "senha");
  const telefone = s(fd, "telefone");
  const veiculoId = s(fd, "veiculo_id");
  if (!nome || !email || !senha)
    return { error: "Nome, e-mail e senha são obrigatórios." };

  const admin = createAdminClient();
  const { data: u, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    app_metadata: { role: "motorista" },
    user_metadata: { nome },
  });
  if (error) return { error: error.message };

  const { error: e2 } = await admin
    .from("usuarios")
    .insert({ id: u.user.id, nome, email, role: "motorista" });
  if (e2) return { error: e2.message };

  await admin.from("motoristas").insert({
    id: u.user.id,
    telefone: telefone || null,
    veiculo_id: veiculoId || null,
  });

  revalidatePath("/gerencia/cadastros");
  return { ok: "Motorista cadastrado." };
}

// ── Ativar/desativar e excluir ────────────────────────────────────────────────
// Exclusão real só é permitida quando NADA histórico depende do registro
// (romaneios, NFs, canhotos) — senão apagaria dados de entregas de verdade.
// Nesses casos, a ação certa é DESATIVAR (campo `ativo`, já existe no schema):
// o cadastro some das listas de "escolher motorista/empresa" para trabalho novo,
// mas o histórico continua íntegro.

export type ActionResult = { ok?: string; error?: string };

export async function alternarAtivoMotorista(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  await requireRole("gerencia");
  const admin = createAdminClient();
  const { error } = await admin.from("usuarios").update({ ativo }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/gerencia/cadastros");
  return { ok: ativo ? "Motorista reativado." : "Motorista desativado." };
}

export async function excluirMotorista(id: string): Promise<ActionResult> {
  await requireRole("gerencia");
  const admin = createAdminClient();

  const [rom, nf, ch] = await Promise.all([
    admin.from("romaneios").select("id", { count: "exact", head: true }).eq("motorista_id", id),
    admin.from("notas_fiscais").select("id", { count: "exact", head: true }).eq("motorista_id", id),
    admin.from("canhotos").select("id", { count: "exact", head: true }).eq("motorista_id", id),
  ]);
  const total = (rom.count ?? 0) + (nf.count ?? 0) + (ch.count ?? 0);
  if (total > 0)
    return {
      error: `Não dá para excluir: esse motorista já tem ${rom.count ?? 0} romaneio(s), ${nf.count ?? 0} NF(s) e ${ch.count ?? 0} canhoto(s) registrados. Desative em vez de excluir.`,
    };

  // Apaga o login (auth.users) — usuarios e motoristas cascateiam junto (schema).
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: error.message };

  revalidatePath("/gerencia/cadastros");
  return { ok: "Motorista excluído." };
}

export async function alternarAtivoEmpresa(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  await requireRole("gerencia");
  const admin = createAdminClient();
  const { error } = await admin.from("empresas_clientes").update({ ativo }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/gerencia/cadastros");
  return { ok: ativo ? "Empresa reativada." : "Empresa desativada." };
}

export async function excluirEmpresa(id: string): Promise<ActionResult> {
  await requireRole("gerencia");
  const admin = createAdminClient();

  const { count: totalNfs } = await admin
    .from("notas_fiscais")
    .select("id", { count: "exact", head: true })
    .eq("empresa_cliente_id", id);
  if ((totalNfs ?? 0) > 0)
    return {
      error: `Não dá para excluir: essa empresa já tem ${totalNfs} nota(s) fiscal(is) registrada(s). Desative em vez de excluir.`,
    };

  // Sem NFs vinculadas — o login do portal do cliente (se existir) não faz mais
  // sentido sozinho, então é removido junto.
  const { data: logins } = await admin.from("usuarios").select("id").eq("empresa_id", id);
  for (const u of logins ?? []) {
    await admin.auth.admin.deleteUser(u.id);
  }

  const { error } = await admin.from("empresas_clientes").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/gerencia/cadastros");
  return { ok: "Empresa excluída." };
}

export async function alternarAtivoVeiculo(
  id: string,
  ativo: boolean,
): Promise<ActionResult> {
  await requireRole("gerencia");
  const admin = createAdminClient();
  const { error } = await admin.from("veiculos").update({ ativo }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/gerencia/cadastros");
  return { ok: ativo ? "Veículo reativado." : "Veículo desativado." };
}

export async function excluirVeiculo(id: string): Promise<ActionResult> {
  await requireRole("gerencia");
  const admin = createAdminClient();

  const [mot, rom] = await Promise.all([
    admin.from("motoristas").select("id", { count: "exact", head: true }).eq("veiculo_id", id),
    admin.from("romaneios").select("id", { count: "exact", head: true }).eq("veiculo_id", id),
  ]);
  const total = (mot.count ?? 0) + (rom.count ?? 0);
  if (total > 0)
    return {
      error: `Não dá para excluir: esse veículo está vinculado a ${mot.count ?? 0} motorista(s) e ${rom.count ?? 0} romaneio(s). Desative em vez de excluir.`,
    };

  const { error } = await admin.from("veiculos").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/gerencia/cadastros");
  return { ok: "Veículo excluído." };
}
