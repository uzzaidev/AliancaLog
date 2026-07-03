"use server";

// Montagem de romaneio por câmera (bipagem) + entrada manual.
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const hoje = () => new Date().toISOString().slice(0, 10);

export type NfEncontrada = {
  id: string;
  numero_nf: string;
  destinatario_nome: string;
  destinatario_endereco: string;
  cidade: string | null;
  empresa_nome: string | null;
};

// Procura uma NF do dia ainda não vinculada a romaneio, pelo número bipado.
export async function buscarNf(numero: string): Promise<NfEncontrada | null> {
  await requireRole("gerencia");
  const n = numero.trim();
  if (!n) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("notas_fiscais")
    .select(
      "id,numero_nf,destinatario_nome,destinatario_endereco,cidade,empresas_clientes(nome)",
    )
    .eq("numero_nf", n)
    .eq("data_entrega", hoje())
    .is("romaneio_id", null)
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  const r = data as Record<string, unknown>;
  const emp = r.empresas_clientes as { nome?: string } | null;
  return {
    id: r.id as string,
    numero_nf: r.numero_nf as string,
    destinatario_nome: r.destinatario_nome as string,
    destinatario_endereco: r.destinatario_endereco as string,
    cidade: (r.cidade as string) ?? null,
    empresa_nome: emp?.nome ?? null,
  };
}

export type ItemRomaneio = {
  nfId?: string;
  numero_nf: string;
  destinatario_nome: string;
  destinatario_endereco: string;
  cidade?: string;
  empresaId?: string;
};

export async function criarRomaneio(input: {
  motoristaId: string;
  veiculoId?: string;
  itens: ItemRomaneio[];
}): Promise<{ ok?: string; error?: string; id?: string }> {
  await requireRole("gerencia");
  if (!input.motoristaId) return { error: "Selecione o motorista." };
  if (!input.itens?.length) return { error: "Adicione pelo menos uma NF." };

  const manuais = input.itens.filter((i) => !i.nfId);
  if (manuais.some((i) => !i.empresaId))
    return { error: "NF manual exige a empresa embarcadora." };

  const supabase = await createClient();
  const data = hoje();

  const { data: rom, error } = await supabase
    .from("romaneios")
    .insert({
      data,
      motorista_id: input.motoristaId,
      veiculo_id: input.veiculoId || null,
      status: "ativo",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // NFs existentes (bipadas e casadas) → vincula ao romaneio e ao motorista.
  const existentes = input.itens.filter((i) => i.nfId).map((i) => i.nfId!);
  if (existentes.length) {
    const { error: e2 } = await supabase
      .from("notas_fiscais")
      .update({ romaneio_id: rom.id, motorista_id: input.motoristaId })
      .in("id", existentes);
    if (e2) return { error: e2.message };
  }

  // NFs manuais → cria já vinculadas.
  if (manuais.length) {
    const payload = manuais.map((i) => ({
      numero_nf: i.numero_nf.trim(),
      empresa_cliente_id: i.empresaId,
      destinatario_nome: i.destinatario_nome.trim(),
      destinatario_endereco: i.destinatario_endereco.trim(),
      cidade: i.cidade?.trim() || null,
      data_entrega: data,
      motorista_id: input.motoristaId,
      romaneio_id: rom.id,
    }));
    const { error: e3 } = await supabase.from("notas_fiscais").insert(payload);
    if (e3) return { error: e3.message };
  }

  revalidatePath("/gerencia/dashboard");
  revalidatePath("/gerencia/romaneios");
  return { ok: "Romaneio criado.", id: rom.id };
}

const STATUS_FINAIS = ["aceita", "recusada", "retida", "ocorrencia"];

// Fecha o romaneio — só permite quando todas as NFs têm status final.
// "Recusada" não bloqueia o fechamento (é um status final como outro qualquer).
export async function fecharRomaneio(
  romaneioId: string,
): Promise<{ ok?: string; error?: string }> {
  await requireRole("gerencia");
  const supabase = await createClient();

  const { data: nfs } = await supabase
    .from("notas_fiscais")
    .select("status")
    .eq("romaneio_id", romaneioId);

  const pendentes = (nfs ?? []).filter(
    (n) => !STATUS_FINAIS.includes(n.status),
  ).length;
  if (pendentes > 0)
    return {
      error: `Ainda há ${pendentes} NF(s) sem status final. Não dá pra fechar.`,
    };
  if (!nfs || nfs.length === 0)
    return { error: "Romaneio sem NFs — nada para fechar." };

  const { error } = await supabase
    .from("romaneios")
    .update({ status: "fechado", fechado_em: new Date().toISOString() })
    .eq("id", romaneioId);
  if (error) return { error: error.message };

  revalidatePath("/gerencia/romaneios");
  revalidatePath(`/gerencia/romaneios/${romaneioId}`);
  return { ok: "Romaneio fechado." };
}
