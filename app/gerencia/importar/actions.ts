"use server";

// Confirma a importação de NFs a partir das linhas mapeadas no cliente.
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { hojeSP } from "@/lib/date";
import {
  duplicatasDoErro,
  encontrarDuplicatas,
  mensagemDuplicatas,
  traduzErroSupabase,
} from "@/lib/import-duplicatas";
import type { ImportResult, ImportRow } from "./types";

export async function confirmarImportacao(input: {
  empresaId: string;
  motoristaId?: string;
  rows: ImportRow[];
}): Promise<ImportResult> {
  await requireRole("gerencia");

  if (!input.empresaId) return { error: "Selecione a empresa embarcadora." };
  const rows = (input.rows ?? []).filter(
    (r) => r.numero_nf && r.destinatario_nome && r.destinatario_endereco,
  );
  if (rows.length === 0)
    return {
      error: "Nenhuma linha válida (precisa de NF, destinatário e endereço).",
    };

  const supabase = await createClient();
  const hoje = hojeSP();

  // Checa duplicidade (mesma chave de acesso) ANTES de tentar inserir — dá pra
  // dizer exatamente qual NF é a repetida em vez do erro cru do Postgres.
  const duplicadas = await encontrarDuplicatas(supabase, rows);
  if (duplicadas.length > 0)
    return { error: mensagemDuplicatas(duplicadas), duplicadas };

  // Se um motorista foi escolhido, já cria o romaneio do dia e vincula as NFs.
  let romaneioId: string | null = null;
  if (input.motoristaId) {
    const { data: rom, error } = await supabase
      .from("romaneios")
      .insert({ data: hoje, motorista_id: input.motoristaId, status: "ativo" })
      .select("id")
      .single();
    if (error) return { error: error.message };
    romaneioId = rom.id;
  }

  const payload = rows.map((r) => ({
    numero_nf: String(r.numero_nf).trim(),
    empresa_cliente_id: input.empresaId,
    destinatario_nome: String(r.destinatario_nome).trim(),
    destinatario_endereco: String(r.destinatario_endereco).trim(),
    cidade: r.cidade ? String(r.cidade).trim() : null,
    observacao: r.observacao ? String(r.observacao).trim() : null,
    chave_acesso: r.chave_acesso?.trim() || null,
    data_entrega: hoje,
    origem_importacao: "gerencia",
    motorista_id: input.motoristaId || null,
    romaneio_id: romaneioId,
  }));

  const { error } = await supabase.from("notas_fiscais").insert(payload);
  if (error) {
    // Compensação: se as NFs não entraram, o romaneio criado acima fica ativo
    // e vazio — o motorista abriria uma rota sem nenhuma entrega. Desfaz.
    if (romaneioId) await supabase.from("romaneios").delete().eq("id", romaneioId);
    // Duplicata que escapou da checagem prévia: devolve QUAL linha colidiu, para
    // a tela marcar em vez de só exibir o texto genérico.
    const duplicadasDoBanco = duplicatasDoErro(error, rows);
    return {
      error: traduzErroSupabase(error.message),
      ...(duplicadasDoBanco.length > 0 ? { duplicadas: duplicadasDoBanco } : {}),
    };
  }

  revalidatePath("/gerencia/dashboard");
  return { ok: `${rows.length} NF(s) importada(s).`, count: rows.length };
}
