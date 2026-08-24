import Link from "next/link";
import { IconChevronLeft } from "@tabler/icons-react";
import { CanhotoForm } from "@/components/motorista/canhoto-form";
import { getNota } from "@/lib/data/motorista";

export default async function CanhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let nf = null;
  try {
    nf = await getNota(id);
  } catch {
    // Modo offline no servidor ou falha de conexão — client tentará obter do STORE_CACHE
  }

  const voltarHref = nf?.romaneio_id
    ? `/motorista/romaneio/${nf.romaneio_id}`
    : "/motorista/entregas";

  return (
    <div className="space-y-4">
      <Link
        href={voltarHref}
        className="inline-flex items-center gap-0.5 text-sm font-medium text-muted hover:text-ink"
      >
        <IconChevronLeft size={16} /> Voltar para as entregas
      </Link>
      <h1 className="text-lg font-bold tracking-tight text-dark">
        Registrar canhoto
      </h1>
      <CanhotoForm nf={nf} nfId={id} />
    </div>
  );
}

