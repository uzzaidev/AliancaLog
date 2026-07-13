import { ImportWizard } from "@/components/gerencia/import-wizard";

export default function ClienteImportarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Enviar notas fiscais
        </h1>
        <p className="text-sm text-muted">
          Suba suas NFs (Excel, XML ou PDF). Elas entram automaticamente na fila
          da transportadora para serem conferidas e roteirizadas.
        </p>
      </div>
      <ImportWizard variant="cliente" />
    </div>
  );
}
