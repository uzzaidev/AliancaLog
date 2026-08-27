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

// 'aceita' é o ÚNICO status final da NF desde A-007 (migration 0016):
// recusada/ocorrência devolvem a NF pro painel como 'pendente' para nova
// tentativa, então nunca ficam persistidas como status da NF — só como
// canhotos.status daquela tentativa específica. Fonte única para todo lugar
// que precisa saber "essa NF está resolvida?" (fechar romaneio, trocar
// motorista, excluir, contar concluídas...).
export const NF_STATUS_FINAIS: NotaStatus[] = ["aceita"];

// Status que ainda exigem alguma ação — o "a fazer" da operação. Usado pra não
// deixar pendência antiga invisível quando nenhum período específico é escolhido
// (dashboard, painel de clientes, mapa, alerta de NF parada).
//
// `ocorrencia` e `recusada` entram aqui desde a migration 0022: a NF passou a
// guardar o DESFECHO da última tentativa em vez de virar sempre 'pendente', mas
// continua precisando de nova tentativa/tratativa. Ou seja:
//   pendente   → nunca foi tentada
//   em_rota    → está com o motorista agora
//   ocorrencia → tentada, deu problema  ─┐ ambas voltaram ao painel
//   recusada   → tentada, cliente recusou ┘ (sem romaneio nem motorista)
// Só `aceita` encerra (ver NF_STATUS_FINAIS).
export const NF_STATUS_ABERTOS: NotaStatus[] = [
  "pendente",
  "em_rota",
  "ocorrencia",
  "recusada",
];

export type OcorrenciaTipo =
  | "item_faltando"
  | "endereco_nao_encontrado"
  | "cliente_ausente"
  | "avaria"
  | "canhoto_retido"
  | "outro";

// NF na visão do motorista (compartilhada entre data layer e componentes client).
// lat/lng: geocodificação do endereço (migration 0014) — null até a gerência
// rodar "Geocodificar" no dashboard; o link "Abrir no Maps" funciona mesmo sem,
// caindo para busca por texto do endereço (ver lib/maps.ts).
export type NotaMotorista = {
  id: string;
  numero_nf: string;
  destinatario_nome: string;
  destinatario_endereco: string;
  cidade: string | null;
  status: NotaStatus;
  lat?: number | null;
  lng?: number | null;
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
  // Foto de chegada (A-010) da tentativa mais recente — separada do canhoto.
  foto_chegada_url: string | null;
  // Observação livre que o motorista deixou no registro (aceita/recusada).
  observacao: string | null;
  // Local do registro do canhoto (best-effort; null se o GPS não estava disponível).
  gps: { lat: number; lng: number } | null;
  ocorrencias: {
    tipo: OcorrenciaTipo;
    descricao: string | null;
    criado_em: string;
  }[];
  // Uma NF pode ter mais de uma tentativa de entrega (A-007: recusada/ocorrência
  // volta pro painel para nova tentativa) — histórico completo, em ordem.
  tentativas: {
    status: CanhotoStatus;
    registrado_em: string;
    foto_url: string | null;
    foto_chegada_url: string | null;
    observacao: string | null;
    motorista_nome: string | null;
  }[];
};
