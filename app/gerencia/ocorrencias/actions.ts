"use server";

// Resolução de ocorrência pela gerência (migrations 0029/0030).
//
// A regra de negócio mora na RPC `resolver_ocorrencia`: ela marca a ocorrência
// como resolvida e, se não sobrar nenhuma pendência aberta naquela NF, promove a
// NF de 'pendencia' para 'aceita' — numa transação só. Aqui ficam só o upload da
// foto e a validação de formulário.
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { OcorrenciaTipo } from "@/lib/types";

export async function resolverOcorrencia(
  form: FormData,
): Promise<{ ok?: true; encerrou?: boolean; error?: string }> {
  const user = await requireRole("gerencia");
  const supabase = await createClient();

  const id = String(form.get("id") ?? "");
  const tipo = String(form.get("tipo") ?? "") as OcorrenciaTipo;
  const resolucao = String(form.get("resolucao") ?? "").trim();
  const dataEntrega = String(form.get("data_entrega") ?? "").trim();
  const foto = form.get("foto");

  if (!id) return { error: "Ocorrência não identificada." };
  if (!resolucao) return { error: "Descreva o que foi feito para resolver." };

  // Canhoto retido EXIGE a foto: o documento assinado é justamente a prova que
  // faltou na entrega, e sem ela a NF seria encerrada sem comprovante. Nota de
  // devolução é resolvida fora do app ("alguém resolve por fora e dá um ok"),
  // então aceita anexo opcional.
  const exigeFoto = tipo === "canhoto_retido";
  const temFoto = foto instanceof File && foto.size > 0;
  if (exigeFoto && !temFoto)
    return { error: "A foto do canhoto assinado é obrigatória para resolver." };
  if (exigeFoto && !/^\d{4}-\d{2}-\d{2}$/.test(dataEntrega))
    return { error: "Informe a data em que a mercadoria foi entregue." };

  // Confere que a ocorrência existe e ainda está aberta ANTES de subir a foto —
  // evita arquivo órfão no Storage quando alguém resolve em duas abas.
  const { data: atual, error: erroBusca } = await supabase
    .from("ocorrencias")
    .select("id,resolvida_em,nota_fiscal_id")
    .eq("id", id)
    .maybeSingle();
  if (erroBusca)
    return { error: `Não consegui ler a ocorrência: ${erroBusca.message}` };
  if (!atual) return { error: "Ocorrência não encontrada." };
  if (atual.resolvida_em) return { error: "Essa ocorrência já foi resolvida." };

  let path: string | null = null;
  if (temFoto) {
    const arquivo = foto as File;
    // Path espelha o do canhoto (/{quem}/{nf}/…), então a prova da resolução
    // fica junto das outras daquela NF no bucket.
    path = `${user.id}/${atual.nota_fiscal_id}/resolucao-${id}.jpg`;
    const { error: erroUpload } = await supabase.storage
      .from("canhotos")
      .upload(path, arquivo, {
        contentType: arquivo.type || "image/jpeg",
        upsert: true,
      });
    if (erroUpload)
      return { error: `Falha ao enviar a foto: ${erroUpload.message}` };
  }

  const texto = dataEntrega
    ? `${resolucao} (resolvido em ${dataEntrega})`
    : resolucao;

  const { data, error } = await supabase.rpc("resolver_ocorrencia", {
    p_ocorrencia_id: id,
    p_resolucao: texto,
    p_foto_url: path,
  });
  if (error) return { error: `Não consegui resolver: ${error.message}` };

  const linha = (Array.isArray(data) ? data[0] : data) as
    | { nf_encerrada?: boolean }
    | undefined;

  revalidatePath("/gerencia/ocorrencias");
  revalidatePath("/gerencia/dashboard");
  return { ok: true, encerrou: linha?.nf_encerrada ?? false };
}
