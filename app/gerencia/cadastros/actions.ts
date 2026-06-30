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
