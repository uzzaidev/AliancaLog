import { RomaneioBuilder } from "@/components/gerencia/romaneio-builder";
import { listEmpresas, listMotoristas, listVeiculos } from "@/lib/data/gerencia";

export default async function NovoRomaneio() {
  const [empresas, motoristas, veiculos] = await Promise.all([
    listEmpresas(),
    listMotoristas(),
    listVeiculos(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo romaneio</h1>
        <p className="text-sm text-muted">
          Bipe as NFs ao carregar o caminhão. O número casa com a importação; se
          não houver, adicione manualmente.
        </p>
      </div>
      <RomaneioBuilder
        empresas={empresas}
        motoristas={motoristas}
        veiculos={veiculos}
      />
    </div>
  );
}
