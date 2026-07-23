import Link from "next/link";
import { IconChevronLeft } from "@tabler/icons-react";
import { RomaneioView } from "@/components/motorista/romaneio-view";
import { getNotasDoRomaneio } from "@/lib/data/motorista";

export default async function RomaneioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const notas = await getNotasDoRomaneio(id);

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
      <RomaneioView notas={notas} />
    </div>
  );
}
