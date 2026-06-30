import "server-only";

// Data Access Layer de autenticação.
// Checagem SEGURA da sessão (no servidor), memoizada por render com React cache.
// O papel (role) e a empresa vêm do app_metadata do JWT, definidos na criação do
// login pela service role — portanto são à prova de adulteração pelo cliente.
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLE_HOME, type Role } from "@/lib/types";

export type SessionUser = {
  id: string;
  email: string | null;
  nome: string | null;
  role: Role | null;
  empresaId: string | null;
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = user.app_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? null,
    nome: (user.user_metadata?.nome as string | undefined) ?? null,
    role: (meta.role as Role | undefined) ?? null,
    empresaId: (meta.empresa_id as string | undefined) ?? null,
  };
});

/** Garante usuário autenticado; senão redireciona para o login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Garante um papel específico; senão manda o usuário para a home dele. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== role) {
    redirect(user.role ? ROLE_HOME[user.role] : "/login");
  }
  return user;
}
