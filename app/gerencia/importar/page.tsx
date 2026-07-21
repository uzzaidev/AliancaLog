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
        <h1 className="text-2xl font-semibold tracking-tight">Importar NFs</h1>
        <p className="text-sm text-muted">
          XML da NF-e (recomendado), Excel/CSV ou PDF. As notas entram na fila do
          dia para montar os romaneios.
        </p>
      </div>
      <ImportWizard
        variant="gerencia"
        empresas={empresas}
        motoristas={motoristas.filter((m) => m.ativo)}
      />
    </div>
  );
}
