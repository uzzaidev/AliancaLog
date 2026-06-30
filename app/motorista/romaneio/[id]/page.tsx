import Link from "next/link";
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
        <h1 className="text-xl font-semibold tracking-tight">Romaneio</h1>
        <Link href="/motorista/entregas" className="text-sm text-brand">
          ‹ Voltar
        </Link>
      </div>
      <RomaneioView notas={notas} />
    </div>
  );
}
