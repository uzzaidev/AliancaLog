// Data operacional do Aliança Log em America/Sao_Paulo.
//
// Por que existe: a operação é no Brasil (UTC-3, sem horário de verão desde 2019).
// Usar `new Date().toISOString().slice(0,10)` pega o dia em UTC — a partir das 21h
// (00h UTC) o "hoje" viraria amanhã, e uma entrega das 21h sumiria do painel do
// dia. Aqui o "dia" é sempre o dia-calendário de São Paulo.
//
// IMPORTANTE: isto é só para o DIA (data_entrega, filtros "de hoje", romaneio do
// dia). Instantes (entregue_em, confirmado_em, fechado_em) continuam em UTC ISO —
// timestamptz guarda o instante correto independente de fuso.

const TZ = "America/Sao_Paulo";

// Formata uma data como YYYY-MM-DD no fuso de São Paulo (en-CA dá esse formato).
function ymdSP(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Dia operacional de hoje (YYYY-MM-DD) no fuso de São Paulo. */
export function hojeSP(): string {
  return ymdSP(new Date());
}

/** Dia operacional de `diasAtras` dias atrás (YYYY-MM-DD) no fuso de São Paulo. */
export function diasAtrasSP(diasAtras: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - diasAtras);
  return ymdSP(d);
}
