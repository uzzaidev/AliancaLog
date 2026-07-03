import "server-only";

// Detalhe do comprovante (foto + timeline) para o modal da gerência e do cliente.
// 1) Lê a NF com o cliente normal (respeitando RLS) — se a NF não for visível pra
//    esse usuário, a query simplesmente não retorna nada (sem vazar existência).
// 2) Só DEPOIS de confirmar que o usuário pode ver a NF é que assinamos a URL da
//    foto via service role — a foto nunca é servida sem essa checagem prévia.
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ComprovanteDetalhe, OcorrenciaTipo } from "@/lib/types";

const SIGNED_URL_TTL = 60 * 60; // 1h

export async function getComprovante(
  nfId: string,
): Promise<ComprovanteDetalhe | null> {
  const supabase = await createClient();

  const { data: nf } = await supabase
    .from("notas_fiscais")
    .select(
      "id,numero_nf,status,destinatario_nome,destinatario_endereco,cidade,created_at,entregue_em,foto_url,empresas_clientes(nome),motoristas(usuarios(nome))",
    )
    .eq("id", nfId)
    .maybeSingle();

  if (!nf) return null; // não existe OU RLS bloqueou — tratamos igual (404)

  const { data: ocorrencias } = await supabase
    .from("ocorrencias")
    .select("tipo,descricao,created_at")
    .eq("nota_fiscal_id", nfId)
    .order("created_at", { ascending: true });

  let fotoUrl: string | null = null;
  const fotoPath = (nf as { foto_url?: string }).foto_url;
  if (fotoPath) {
    const admin = createAdminClient();
    const { data: signed } = await admin.storage
      .from("canhotos")
      .createSignedUrl(fotoPath, SIGNED_URL_TTL);
    fotoUrl = signed?.signedUrl ?? null;
  }

  const r = nf as Record<string, unknown>;
  const empresa = r.empresas_clientes as { nome?: string } | null;
  const motorista = r.motoristas as { usuarios?: { nome?: string } } | null;

  return {
    id: r.id as string,
    numero_nf: r.numero_nf as string,
    status: r.status as ComprovanteDetalhe["status"],
    destinatario_nome: r.destinatario_nome as string,
    destinatario_endereco: r.destinatario_endereco as string,
    cidade: (r.cidade as string) ?? null,
    empresa_nome: empresa?.nome ?? null,
    motorista_nome: motorista?.usuarios?.nome ?? null,
    criado_em: r.created_at as string,
    entregue_em: (r.entregue_em as string) ?? null,
    foto_url: fotoUrl,
    ocorrencias: ((ocorrencias ?? []) as Record<string, unknown>[]).map((o) => ({
      tipo: o.tipo as OcorrenciaTipo,
      descricao: (o.descricao as string) ?? null,
      criado_em: o.created_at as string,
    })),
  };
}
