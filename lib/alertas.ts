// Regra de "NF parada" (A-008) — fonte única, usada pelo painel da gerência.
//
// Decisões de produto embutidas aqui:
//  - A contagem parte da `data_entrega` (data-alvo combinada da entrega), não da
//    importação: o que interessa é há quanto tempo a entrega está atrasada em
//    relação ao que foi prometido.
//  - Só conta NF em aberto (`NF_STATUS_ABERTOS`). Uma NF `aceita` está resolvida,
//    não importa a idade. Desde o A-007 (migration 0016) `recusada`/`ocorrencia`
//    não ficam mais persistidas na NF — voltam para `pendente` —, então
//    "em aberto" já cobre exatamente o conjunto certo: tudo que ainda precisa de
//    uma nova tentativa de entrega.
import { NF_STATUS_ABERTOS, type NotaStatus } from "@/lib/types";
import { hojeSP } from "@/lib/date";

/** Limite em dias a partir do qual uma NF em aberto é considerada "parada". */
export const DIAS_PARA_ALERTA = 7;

/** Dias corridos entre a data-alvo de entrega e hoje (0 se for hoje ou futuro). */
export function diasParada(dataEntrega: string, hoje = hojeSP()): number {
  // Ambas em YYYY-MM-DD (dia-calendário de São Paulo, ver lib/date.ts) —
  // comparar como UTC puro evita que o fuso local do navegador desloque um dia.
  const alvo = Date.parse(`${dataEntrega}T00:00:00Z`);
  const ref = Date.parse(`${hoje}T00:00:00Z`);
  if (Number.isNaN(alvo) || Number.isNaN(ref)) return 0;
  const dias = Math.floor((ref - alvo) / 86_400_000);
  return dias > 0 ? dias : 0;
}

/** NF em aberto e atrasada há `DIAS_PARA_ALERTA` dias ou mais. */
export function isNotaParada(
  nota: { status: NotaStatus; data_entrega: string },
  hoje = hojeSP(),
): boolean {
  if (!NF_STATUS_ABERTOS.includes(nota.status)) return false;
  return diasParada(nota.data_entrega, hoje) >= DIAS_PARA_ALERTA;
}
