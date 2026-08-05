// Tipos compartilhados da importação de NFs.
// Ficam FORA dos arquivos "use server" (actions.ts) porque um módulo de server
// actions só pode exportar funções async — re-exportar tipos ali quebra em
// runtime no Turbopack ("DuplicataInfo is not defined").
import type { DuplicataInfo } from "@/lib/import-duplicatas";

export type { DuplicataInfo };

export type ImportRow = {
  numero_nf: string;
  destinatario_nome: string;
  destinatario_endereco: string;
  cidade?: string;
  observacao?: string;
  // Chave de acesso da NF-e (44 díg.) — vem do XML/PDF; Excel geralmente não tem.
  chave_acesso?: string;
};

export type ImportResult = {
  ok?: string;
  error?: string;
  count?: number;
  duplicadas?: DuplicataInfo[];
};
