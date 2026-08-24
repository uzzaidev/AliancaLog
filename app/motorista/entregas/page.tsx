import { EntregasView } from "@/components/motorista/entregas-view";
import { getRomaneiosDoDia } from "@/lib/data/motorista";

export default async function MotoristaEntregas() {
  const romaneios = await getRomaneiosDoDia();

  return <EntregasView initialRomaneios={romaneios} />;
}

