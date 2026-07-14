import Link from "next/link";
import { notFound } from "next/navigation";
import { CanhotoForm } from "@/components/motorista/canhoto-form";
import { getNota } from "@/lib/data/motorista";

export default async function CanhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const nf = await getNota(id);
  if (!nf) notFound();

  const voltarHref = nf.romaneio_id
    ? `/motorista/romaneio/${nf.romaneio_id}`
    : "/motorista/entregas";

  return (
    <div className="space-y-4">
      <Link
        href={voltarHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink"
      >
        ‹ Voltar para as entregas
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Registrar canhoto</h1>
      <CanhotoForm nf={nf} />
    </div>
  );
}
