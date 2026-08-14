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
  const observacao = form.get("observacao")?.toString() || null;
  const foto = form.get("foto") as File | null;
  const fotoChegada = form.get("foto_chegada") as File | null;

  // GPS do registro (best-effort — ausente quando o motorista negou permissão).
  const num = (k: string) => {
    const v = form.get(k)?.toString();
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const lat = num("lat");
  const lng = num("lng");
  const gpsPrecisao = num("gps_precisao");

  if (!clientId || !nfId || !status)
    return NextResponse.json({ error: "dados incompletos" }, { status: 400 });
  // Regra de negócio: foto obrigatória em TODOS os status (prova da entrega/ocorrência).
  if (!foto || foto.size === 0)
    return NextResponse.json({ error: "foto obrigatória" }, { status: 400 });
  // A-010: foto de chegada é SEPARADA da foto do canhoto e também obrigatória —
  // mitiga o motorista alegar "porta fechada" sem comprovar que esteve no local.
  if (!fotoChegada || fotoChegada.size === 0)
    return NextResponse.json({ error: "foto de chegada obrigatória" }, { status: 400 });

  // 0. Idempotência de ponta a ponta por TENTATIVA (client_id), não por NF: uma
  // NF pode legitimamente ganhar um 2º/3º canhoto de tentativas diferentes desde
  // A-007 (recusada/ocorrência volta pro painel para nova entrega). O reenvio do
  // MESMO registro (retry de rede) é que precisa ser no-op. (A checagem
  // definitiva é repetida dentro da função transacional abaixo — esta aqui é só
  // uma saída rápida.)
  const { data: jaRegistrada } = await supabase
    .from("canhotos")
    .select("client_id")
    .eq("client_id", clientId)
    .limit(1);
  if (jaRegistrada && jaRegistrada.length > 0) {
    // 409 = já existia; a fila offline trata como sucesso e remove o item.
    return NextResponse.json({ ok: true, already: true }, { status: 409 });
  }

  // 1. Sobe as duas fotos no bucket privado, em paralelo (uma não depende da
  // outra — motorista já espera as duas por rede móvel, subir em série só
  // somaria a latência das duas à toa).
  // Sem upsert: o path é derivado do client_id, então re-sync cai no mesmo
  // arquivo e "já existe" é idempotência, não erro. (O upsert do Storage
  // exigiria UPDATE em storage.objects, que o motorista não tem — e não deve,
  // já que o canhoto é imutável após confirmado.)
  const fotoPath = `${user.id}/${nfId}/${clientId}.jpg`;
  const fotoChegadaPath = `${user.id}/${nfId}/${clientId}-chegada.jpg`;
  const [upFoto, upChegada] = await Promise.all([
    supabase.storage.from("canhotos").upload(fotoPath, foto, { contentType: "image/jpeg" }),
    supabase.storage
      .from("canhotos")
      .upload(fotoChegadaPath, fotoChegada, { contentType: "image/jpeg" }),
  ]);
  if (upFoto.error && !/already exists/i.test(upFoto.error.message))
    return NextResponse.json({ error: upFoto.error.message }, { status: 500 });
  if (upChegada.error && !/already exists/i.test(upChegada.error.message))
    return NextResponse.json({ error: upChegada.error.message }, { status: 500 });

  // 2-4. Canhoto + NF + ocorrência em UMA transação no banco (função
  // registrar_entrega_offline, migration 0011). Se qualquer etapa falhar, o
  // Postgres reverte tudo — nunca fica canhoto gravado com NF pendente.
  const { data: rpcData, error: rpcErr } = await supabase.rpc(
    "registrar_entrega_offline",
    {
      p_client_id: clientId,
      p_nota_fiscal_id: nfId,
      p_status: status,
      p_foto_url: fotoPath,
      p_lat: lat,
      p_lng: lng,
      p_gps_precisao: gpsPrecisao,
      p_observacao: observacao,
      p_ocorrencia_tipo: ocorrenciaTipo,
      p_ocorrencia_desc: ocorrenciaDesc,
      p_foto_chegada_url: fotoChegadaPath,
    },
  );
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 });

  const jaExistia = Array.isArray(rpcData) ? rpcData[0]?.ja_existia : rpcData?.ja_existia;
  if (jaExistia) return NextResponse.json({ ok: true, already: true }, { status: 409 });

  return NextResponse.json({ ok: true });
}
