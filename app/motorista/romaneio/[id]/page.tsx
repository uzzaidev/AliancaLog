import Link from "next/link";
import { IconChevronLeft } from "@tabler/icons-react";
import { RomaneioView } from "@/components/motorista/romaneio-view";
import { AjudanteButton } from "@/components/motorista/ajudante-button";
import { getAjudanteDoRomaneio, getNotasDoRomaneio } from "@/lib/data/motorista";

export default async function RomaneioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [notas, romaneio] = await Promise.all([
    getNotasDoRomaneio(id),
    getAjudanteDoRomaneio(id),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight text-dark">Romaneio</h1>
        <Link
          href="/motorista/entregas"
          className="inline-flex items-center gap-0.5 text-sm font-medium text-brand"
        >
          <IconChevronLeft size={16} /> Voltar
        </Link>
      </div>
      {romaneio &&
        (romaneio.status === "fechado" ? (
          romaneio.ajudante_nome && (
            <p className="text-sm text-muted">
              Ajudante: <span className="font-medium text-ink">{romaneio.ajudante_nome}</span>
            </p>
          )
        ) : (
          <AjudanteButton romaneioId={id} ajudanteAtual={romaneio.ajudante_nome} />
        ))}
      <RomaneioView notas={notas} romaneioId={id} />
    </div>
  );
}
