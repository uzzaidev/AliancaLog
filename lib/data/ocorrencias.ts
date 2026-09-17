import "server-only";

// Ocorrências da gerência. Existe como tela própria (e não só como card de KPI)
// porque depois da 0029 a ocorrência virou uma pendência com ciclo de vida: o
// canhoto retido encerra a entrega mas deixa a pendência aberta, e alguém
// precisa de um lugar para ver o que está em aberto e fechar com a prova.
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OcorrenciaTipo } from "@/lib/types";

const SIGNED_URL_TTL = 60 * 60; // 1h, mesmo padrão do comprovante

export type OcorrenciaRow = {
  id: string;
  tipo: OcorrenciaTipo;
  descricao: string | null;
  criado_em: string;
  resolvida_em: string | null;
  resolucao: string | null;
  /** URL assinada da foto que fechou a pendência (null enquanto aberta). */
  foto_resolucao_url: string | null;
  resolvida_por_nome: string | null;
  nf_id: string;
  numero_nf: string;
  destinatario_nome: string;
  cidade: string | null;
  empresa_nome: string | null;
  /** Dias desde que a ocorrência foi aberta — base do destaque de "parada". */
  dias_aberta: number;
};

export type OcorrenciaFiltro = {
  /** "abertas" (padrão) · "resolvidas" · "todas" */
  situacao?: "abertas" | "resolvidas" | "todas";
  tipo?: string;
};

export async function getOcorrencias(
  f: OcorrenciaFiltro = {},
): Promise<OcorrenciaRow[]> {
  const supabase = await createClient();

  let q = supabase
    .from("ocorrencias")
    .select(
      "id,tipo,descricao,created_at,resolvida_em,resolucao,foto_resolucao_url," +
        "resolvida_por:usuarios!resolvida_por(nome)," +
        "notas_fiscais(id,numero_nf,destinatario_nome,cidade,empresas_clientes(nome))",
    )
    .order("created_at", { ascending: true }) // mais antigas primeiro: são as que apodrecem
    .limit(300);

  const situacao = f.situacao ?? "abertas";
  if (situacao === "abertas") q = q.is("resolvida_em", null);
  else if (situacao === "resolvidas") q = q.not("resolvida_em", "is", null);
  if (f.tipo) q = q.eq("tipo", f.tipo);

  const { data, error } = await q;
  // Lista vazia e erro de query são indistinguíveis na tela — o erro precisa
  // aparecer no log (ver o embed ambíguo da 0026, invisível por 3 dias).
  if (error) console.error("[getOcorrencias] query falhou:", error.message);

  const admin = createAdminClient();
  const hoje = Date.now();

  return Promise.all(
    ((data ?? []) as unknown as Record<string, unknown>[]).map(async (r) => {
      const nf = r.notas_fiscais as Record<string, unknown> | null;
      const emp = nf?.empresas_clientes as { nome?: string } | null;
      const quem = r.resolvida_por as { nome?: string } | null;

      // Assinar só depois do RLS ter confirmado que a gerência vê a ocorrência —
      // mesmo padrão do comprovante.
      const path = r.foto_resolucao_url as string | null;
      let fotoUrl: string | null = null;
      if (path) {
        const { data: signed } = await admin.storage
          .from("canhotos")
          .createSignedUrl(path, SIGNED_URL_TTL);
        fotoUrl = signed?.signedUrl ?? null;
      }

      const criado = r.created_at as string;
      return {
        id: r.id as string,
        tipo: r.tipo as OcorrenciaTipo,
        descricao: (r.descricao as string) ?? null,
        criado_em: criado,
        resolvida_em: (r.resolvida_em as string) ?? null,
        resolucao: (r.resolucao as string) ?? null,
        foto_resolucao_url: fotoUrl,
        resolvida_por_nome: quem?.nome ?? null,
        nf_id: (nf?.id as string) ?? "",
        numero_nf: (nf?.numero_nf as string) ?? "—",
        destinatario_nome: (nf?.destinatario_nome as string) ?? "—",
        cidade: (nf?.cidade as string) ?? null,
        empresa_nome: emp?.nome ?? null,
        dias_aberta: Math.floor(
          (hoje - new Date(criado).getTime()) / 86_400_000,
        ),
      };
    }),
  );
}

/** Contagem de ocorrências abertas — alimenta o selo no menu da gerência. */
export async function contarOcorrenciasAbertas(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("ocorrencias")
    .select("id", { count: "exact", head: true })
    .is("resolvida_em", null);
  if (error)
    console.error("[contarOcorrenciasAbertas] query falhou:", error.message);
  return count ?? 0;
}
