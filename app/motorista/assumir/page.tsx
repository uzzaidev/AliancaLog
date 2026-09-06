import Link from "next/link";
import { IconChevronLeft } from "@tabler/icons-react";
import { AssumirNf } from "@/components/motorista/assumir-nf";

export default function AssumirNfPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight text-dark">
          Assumir nota
        </h1>
        <Link
          href="/motorista/entregas"
          className="inline-flex items-center gap-0.5 text-sm font-medium text-brand"
        >
          <IconChevronLeft size={16} /> Voltar
        </Link>
      </div>
      <AssumirNf />
    </div>
  );
}
