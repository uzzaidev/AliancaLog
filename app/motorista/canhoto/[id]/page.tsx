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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Registrar canhoto</h1>
      <CanhotoForm nf={nf} />
    </div>
  );
}
