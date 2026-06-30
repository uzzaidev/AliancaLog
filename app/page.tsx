import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/dal";
import { ROLE_HOME } from "@/lib/types";

// A raiz apenas encaminha cada usuário para a home do seu perfil.
// (O proxy.ts já cobre isso; aqui é a rede de segurança server-side.)
export default async function Home() {
  const user = await getSessionUser();
  if (!user || !user.role) redirect("/login");
  redirect(ROLE_HOME[user.role]);
}
