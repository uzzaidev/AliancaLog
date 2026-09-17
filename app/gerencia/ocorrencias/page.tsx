import { OcorrenciasList } from "@/components/gerencia/ocorrencias-list";
import { getOcorrencias, type OcorrenciaFiltro } from "@/lib/data/ocorrencias";

export default async function OcorrenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ situacao?: string; tipo?: string }>;
}) {
  const sp = await searchParams;
  const situacao = (
    ["abertas", "resolvidas", "todas"].includes(sp.situacao ?? "")
      ? sp.situacao
      : "abertas"
  ) as OcorrenciaFiltro["situacao"];

  const ocorrencias = await getOcorrencias({ situacao, tipo: sp.tipo });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ocorrências</h1>
        <p className="mt-1 text-sm text-muted">
          Entregas que deram problema. Canhoto retido fica aqui até alguém trazer
          a via assinada — a mercadoria já foi entregue, então a NF não volta
          para a fila. Os demais motivos devolvem a NF ao painel para nova
          tentativa.
        </p>
      </div>

      <OcorrenciasList
        ocorrencias={ocorrencias}
        situacao={situacao ?? "abertas"}
        tipo={sp.tipo ?? ""}
      />
    </div>
  );
}
