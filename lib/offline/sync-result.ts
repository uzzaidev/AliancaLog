export type DisposicaoSync =
  | "sucesso"
  | "validacao"
  | "autenticacao"
  | "tentar_novamente";

/** Decisão centralizada para a fila não confundir descarte com sucesso. */
export function classificarRespostaSync(status: number): DisposicaoSync {
  if ((status >= 200 && status < 300) || status === 409) return "sucesso";
  if (status === 400) return "validacao";
  if (status === 401 || status === 403) return "autenticacao";
  return "tentar_novamente";
}

export function mensagemRespostaSync(
  numeroNf: string,
  status: number,
  detalhe = "",
): string {
  const sufixo = detalhe ? ` — ${detalhe}` : "";
  if (status === 400)
    return `NF ${numeroNf}: o servidor recusou os dados${sufixo}. O registro foi preservado no aparelho.`;
  if (status === 401 || status === 403)
    return `NF ${numeroNf}: sessão sem permissão para enviar${sufixo}. Entre novamente.`;
  return `NF ${numeroNf}: erro ${status}${sufixo}`;
}
