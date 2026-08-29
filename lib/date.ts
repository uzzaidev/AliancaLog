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

/** Início do dia operacional (00:00 em SP) como instante ISO/UTC — para filtrar
 *  colunas timestamptz (ex.: canhotos.registrado_em) por dia-calendário de SP. */
export function inicioDiaSP(dataYMD: string): string {
  return `${dataYMD}T03:00:00.000Z`; // 00:00 em SP = 03:00 UTC (SP é UTC-3 fixo)
}

/** Dia seguinte (YYYY-MM-DD) a partir de uma data já em formato YMD — puramente
 *  aritmético no calendário, não depende do fuso (só soma 1 ao dia). */
export function diaSeguinte(dataYMD: string): string {
  const [ano, mes, dia] = dataYMD.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + 1)).toISOString().slice(0, 10);
}

// ── Exibição de instantes (timestamptz) ──────────────────────────────────────
//
// SEMPRE fixar `timeZone` ao formatar para a tela. Sem isso o resultado depende
// do relógio de quem executa, e isso quebra de duas formas:
//
//   1. Hidratação: o Server Component roda na Vercel (UTC) e imprime "20:43";
//      o mesmo componente re-renderiza no celular (UTC-3) e imprime "17:43".
//      Texto diferente entre servidor e cliente = React error #418, a tela
//      inteira é descartada e remontada. Aconteceu em produção em 27/08.
//   2. Correção: um canhoto registrado às 17:43 aparecia como 20:43 no painel,
//      porque o servidor formatava no próprio fuso.
//
// A operação é no Brasil, então a hora que interessa é sempre a de São Paulo —
// independente de onde o código roda ou de onde o usuário está.

/** Hora (HH:MM) de um instante ISO, sempre no fuso da operação. */
export function horaSP(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

/** Data e hora curtas (DD/MM HH:MM) de um instante ISO, no fuso da operação. */
export function dataHoraSP(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

/** Data por extenso ("segunda-feira, 27 de agosto de 2026") no fuso da operação. */
export function dataExtensaSP(dataYMD: string): string {
  // Ancora no meio-dia UTC: qualquer fuso do Brasil cai no mesmo dia-calendário,
  // então a data por extenso não "anda" para o dia anterior.
  return new Date(`${dataYMD}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });
}
