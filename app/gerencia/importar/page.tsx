import { ImportWizard } from "@/components/gerencia/import-wizard";
import { listEmpresas, listMotoristas } from "@/lib/data/gerencia";

export default async function ImportarPage() {
  const [empresas, motoristas] = await Promise.all([
    listEmpresas(),
    listMotoristas(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar Excel</h1>
        <p className="text-sm text-muted">
          Suba a planilha da empresa embarcadora para criar as NFs do dia.
        </p>
      </div>
      <ImportWizard empresas={empresas} motoristas={motoristas} />
    </div>
  );
}
