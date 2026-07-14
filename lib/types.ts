// Tipos de domínio compartilhados — fonte única de verdade para os enums do produto.
// Mantém alinhamento com o schema SQL (supabase/migrations) e as regras de negócio do plano.

export type Role = "gerencia" | "motorista" | "cliente_final";

export type RomaneioStatus = "rascunho" | "ativo" | "fechado";

// Status de uma NF ao longo do ciclo de entrega.
// "retida" saiu (migration 0008): virou o tipo de ocorrência canhoto_retido.
export type NotaStatus =
  | "pendente"
  | "em_rota"
  | "aceita"
  | "recusada"
  | "ocorrencia";

// Status final possível registrado pelo motorista no canhoto.
export type CanhotoStatus = "aceita" | "recusada" | "ocorrencia";

export type OcorrenciaTipo =
  | "item_faltando"
  | "endereco_nao_encontrado"
  | "cliente_ausente"
  | "avaria"
  | "canhoto_retido"
  | "outro";

// NF na visão do motorista (compartilhada entre data layer e componentes client).
export type NotaMotorista = {
  id: string;
  numero_nf: string;
  destinatario_nome: string;
  destinatario_endereco: string;
  cidade: string | null;
  status: NotaStatus;
};

// Para onde cada perfil é levado após o login.
export const ROLE_HOME: Record<Role, string> = {
  gerencia: "/gerencia/dashboard",
  motorista: "/motorista/entregas",
  cliente_final: "/cliente/notas",
};

// Prefixo de rota que cada perfil tem permissão de acessar.
export const ROLE_AREA: Record<Role, string> = {
  gerencia: "/gerencia",
  motorista: "/motorista",
  cliente_final: "/cliente",
};

export const ROLE_LABEL: Record<Role, string> = {
  gerencia: "Gerência",
  motorista: "Motorista",
  cliente_final: "Cliente",
};

// Rótulos em pt-BR + metadados visuais para cada status de NF.
export const NOTA_STATUS_META: Record<
  NotaStatus,
  { label: string; tone: "neutral" | "info" | "success" | "danger" | "warning" }
> = {
  pendente: { label: "Pendente", tone: "neutral" },
  em_rota: { label: "Em rota", tone: "info" },
  aceita: { label: "Aceita", tone: "success" },
  recusada: { label: "Recusada", tone: "danger" },
  ocorrencia: { label: "Ocorrência", tone: "warning" },
};

export const OCORRENCIA_LABEL: Record<OcorrenciaTipo, string> = {
  item_faltando: "Item faltando",
  endereco_nao_encontrado: "Endereço não encontrado",
  cliente_ausente: "Cliente ausente",
  avaria: "Avaria",
  canhoto_retido: "Canhoto retido",
  outro: "Outro",
};

// Detalhe do comprovante de entrega (modal da gerência e do cliente).
// foto_url já vem como URL assinada temporária (não o caminho cru do bucket).
export type ComprovanteDetalhe = {
  id: string;
  numero_nf: string;
  status: NotaStatus;
  destinatario_nome: string;
  destinatario_endereco: string;
  cidade: string | null;
  empresa_nome: string | null;
  motorista_nome: string | null;
  criado_em: string;
  entregue_em: string | null;
  foto_url: string | null;
  // Observação livre que o motorista deixou no registro (aceita/recusada).
  observacao: string | null;
  // Local do registro do canhoto (best-effort; null se o GPS não estava disponível).
  gps: { lat: number; lng: number } | null;
  ocorrencias: {
    tipo: OcorrenciaTipo;
    descricao: string | null;
    criado_em: string;
  }[];
};
