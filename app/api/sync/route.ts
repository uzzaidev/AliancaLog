// Recebe um canhoto da fila offline do motorista e persiste de forma idempotente.
// Roda com a sessão do usuário (cookies) → o RLS garante que só o dono escreve.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  if (user.app_metadata?.role !== "motorista")
    return NextResponse.json({ error: "apenas motorista" }, { status: 403 });

  const form = await req.formData();
  const clientId = String(form.get("client_id") ?? "");
  const nfId = String(form.get("nf_id") ?? "");
  const status = String(form.get("status") ?? "");
  const ocorrenciaTipo = form.get("ocorrencia_tipo")?.toString() || null;
  const ocorrenciaDesc = form.get("ocorrencia_desc")?.toString() || null;
  const foto = form.get("foto") as File | null;

  if (!clientId || !nfId || !status)
    return NextResponse.json({ error: "dados incompletos" }, { status: 400 });
  // Regra de negócio: foto obrigatória para "Aceita".
  if (status === "aceita" && (!foto || foto.size === 0))
    return NextResponse.json({ error: "foto obrigatória para aceita" }, { status: 400 });

  // 1. Sobe a foto (se houver) no bucket privado.
  let fotoPath: string | null = null;
  if (foto && foto.size > 0) {
    fotoPath = `${nfId}/${clientId}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("canhotos")
      .upload(fotoPath, foto, { upsert: true, contentType: "image/jpeg" });
    if (upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // 2. Grava o canhoto (idempotente pelo client_id).
  const { error: cErr } = await supabase
    .from("canhotos")
    .upsert(
      {
        client_id: clientId,
        nota_fiscal_id: nfId,
        motorista_id: user.id,
        foto_url: fotoPath,
        status,
        sincronizado: true,
      },
      { onConflict: "client_id", ignoreDuplicates: true },
    );
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  // 3. Atualiza o status da NF.
  const { error: nErr } = await supabase
    .from("notas_fiscais")
    .update({
      status,
      foto_url: fotoPath,
      entregue_em: new Date().toISOString(),
    })
    .eq("id", nfId);
  if (nErr) return NextResponse.json({ error: nErr.message }, { status: 500 });

  // 4. Ocorrência (quando aplicável).
  if (status === "ocorrencia" && ocorrenciaTipo) {
    await supabase.from("ocorrencias").insert({
      nota_fiscal_id: nfId,
      tipo: ocorrenciaTipo,
      descricao: ocorrenciaDesc,
    });
  }

  return NextResponse.json({ ok: true });
}
