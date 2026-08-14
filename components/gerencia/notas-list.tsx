"use client";

// Tabela de entregas do dia (padrão Track-POD): linha clicável expande um painel
// de detalhe inline; a célula de foto abre o comprovante (foto assinada) no modal.
import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  IconSearch,
  IconMapPin,
  IconMapPinOff,
  IconPhoto,
  IconCamera,
  IconUser,
  IconArrowsExchange,
  IconCopy,
  IconTrash,
  IconClockExclamation,
} from "@tabler/icons-react";
import { Button, Card, StatusBadge } from "@/components/ui";
import { ComprovanteModal } from "@/components/comprovante-modal";
import {
  excluirNotas,
  getComprovanteGerencia,
  trocarMotorista,
} from "@/app/gerencia/dashboard/actions";
import {
  corrigirEnderecoEGeocodificar,
  definirCoordenadaManual,
} from "@/app/gerencia/dashboard/geocode-actions";
import type { MotoristaItem, NotaRow } from "@/lib/data/gerencia";
import { NF_STATUS_FINAIS } from "@/lib/types";
import { DIAS_PARA_ALERTA, diasParada, isNotaParada } from "@/lib/alertas";

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TH =
  "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted";

export function NotasList({
  notas,
  motoristas = [],
}: {
  notas: NotaRow[];
  motoristas?: MotoristaItem[];
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [expandida, setExpandida] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [msgExclusao, setMsgExclusao] = useState<string | null>(null);
  const [excluindo, startExclusao] = useTransition();
  const [soParadas, setSoParadas] = useState(false);

  // NFs em aberto e atrasadas (A-008) — regra em lib/alertas.ts.
  const idsParadas = useMemo(() => {
    const ids = new Set<string>();
    for (const n of notas) if (isNotaParada(n)) ids.add(n.id);
    return ids;
  }, [notas]);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const base = soParadas ? notas.filter((n) => idsParadas.has(n.id)) : notas;
    if (!t) return base;
    return base.filter(
      (n) =>
        n.numero_nf.toLowerCase().includes(t) ||
        n.destinatario_nome.toLowerCase().includes(t) ||
        (n.empresa_nome ?? "").toLowerCase().includes(t) ||
        (n.destinatario_endereco ?? "").toLowerCase().includes(t) ||
        (n.cidade ?? "").toLowerCase().includes(t),
    );
  }, [busca, notas, soParadas, idsParadas]);

  // NFs cujo número aparece mais de uma vez — sinal de duplicidade (chave_acesso
  // é única no banco, então duplicata real só acontece por número repetido:
  // reimportação, ou NF manual sem chave batendo com uma já existente).
  const idsDuplicados = useMemo(() => {
    const porNumero = new Map<string, string[]>();
    for (const n of notas) {
      const arr = porNumero.get(n.numero_nf) ?? [];
      arr.push(n.id);
      porNumero.set(n.numero_nf, arr);
    }
    const ids = new Set<string>();
    for (const arr of porNumero.values())
      if (arr.length > 1) for (const id of arr) ids.add(id);
    return ids;
  }, [notas]);

  function toggleSelecao(id: string) {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function marcarDuplicadas() {
    setBusca("");
    setMsgExclusao(null);
    setSelecionadas(new Set(idsDuplicados));
  }

  function excluirSelecionadas() {
    if (selecionadas.size === 0) return;
    if (
      !confirm(
        `Excluir ${selecionadas.size} NF(s) selecionada(s)? Essa ação não pode ser desfeita.`,
      )
    )
      return;
    setMsgExclusao(null);
    startExclusao(async () => {
      const res = await excluirNotas(Array.from(selecionadas));
      setMsgExclusao(res.error ?? res.ok ?? null);
      if (!res.error) {
        setSelecionadas(new Set());
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <IconSearch
            size={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por NF, cliente, endereço…"
            className="w-full rounded-md border border-line bg-gray-50 py-2 pl-8 pr-3 text-sm text-ink outline-none focus:border-brand focus:bg-surface"
          />
        </div>

        {idsParadas.size > 0 && (
          <button
            onClick={() => setSoParadas((v) => !v)}
            aria-pressed={soParadas}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors ${
              soParadas
                ? "border-danger bg-danger text-white"
                : "border-danger-border bg-danger-50 text-danger hover:opacity-80"
            }`}
          >
            <IconClockExclamation size={14} />
            {idsParadas.size} parada(s) há +{DIAS_PARA_ALERTA} dias
            {soParadas ? " — mostrando só estas" : ""}
          </button>
        )}

        {idsDuplicados.size > 0 && selecionadas.size === 0 && (
          <button
            onClick={marcarDuplicadas}
            className="flex items-center gap-1.5 rounded-md border border-warning-border bg-warning-50 px-2.5 py-2 text-xs font-medium text-warning hover:opacity-80"
          >
            <IconCopy size={14} />
            {idsDuplicados.size} nota(s) com número repetido — marcar
          </button>
        )}

        {selecionadas.size > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-line bg-gray-50 px-2.5 py-1.5">
            <span className="text-xs font-medium text-ink">
              {selecionadas.size} selecionada(s)
            </span>
            <Button
              onClick={excluirSelecionadas}
              disabled={excluindo}
              variant="danger"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs"
            >
              <IconTrash size={13} />
              {excluindo ? "Excluindo…" : "Excluir selecionadas"}
            </Button>
            <button
              onClick={() => setSelecionadas(new Set())}
              className="text-xs text-muted hover:text-ink"
            >
              limpar seleção
            </button>
          </div>
        )}
      </div>

      {msgExclusao && (
        <p className="text-xs text-danger">{msgExclusao}</p>
      )}

      {filtradas.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          Nenhuma NF encontrada para o filtro atual.
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-line bg-gray-50 text-left">
                <th className={`${TH} w-8`}></th>
                <th className={TH}>NF</th>
                <th className={TH}>Cliente / Destinatário</th>
                <th className={TH}>Motorista</th>
                <th className={TH}>Status</th>
                <th className={TH}>Foto</th>
                <th className={`${TH} text-right`}>Hora</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((nf) => {
                const aberto = expandida === nf.id;
                return (
                  <Fragment key={nf.id}>
                    <tr
                      onClick={() => setExpandida(aberto ? null : nf.id)}
                      className={`cursor-pointer border-b border-gray-100 transition-colors ${
                        aberto
                          ? "bg-brand-100"
                          : "hover:bg-brand-50"
                      }`}
                    >
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selecionadas.has(nf.id)}
                          onChange={() => toggleSelecao(nf.id)}
                          className="h-4 w-4"
                          aria-label={`Selecionar NF ${nf.numero_nf}`}
                        />
                      </td>
                      <td
                        className={`px-3 py-2.5 font-bold text-dark ${
                          idsDuplicados.has(nf.id) ? "text-warning" : ""
                        }`}
                      >
                        {nf.numero_nf}
                        {idsDuplicados.has(nf.id) && (
                          <IconCopy
                            size={12}
                            className="ml-1 inline text-warning"
                            aria-label="Número repetido"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-ink">
                          {nf.destinatario_nome}
                          {nf.empresa_nome && (
                            <span className="ml-1.5 rounded bg-info-50 px-1.5 py-0.5 text-[10px] font-medium text-info">
                              {nf.empresa_nome}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                          <IconMapPin size={11} />
                          <span className="truncate">
                            {nf.destinatario_endereco}
                            {nf.cidade ? `, ${nf.cidade}` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {nf.motorista_nome ? (
                          <span className="flex items-center gap-1.5 text-ink">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" />
                            {nf.motorista_nome}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-gray-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                            Não atribuído
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={nf.status} />
                          {idsParadas.has(nf.id) && (
                            <span
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-danger-50 px-2 py-0.5 text-[10px] font-semibold text-danger ring-1 ring-inset ring-danger-border"
                              title={`Em aberto desde ${nf.data_entrega}`}
                            >
                              <IconClockExclamation size={11} />
                              {diasParada(nf.data_entrega)}d parada
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAberta(nf.id);
                          }}
                          aria-label="Ver comprovante"
                          className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                            nf.foto_url
                              ? "border-brand bg-brand-50 text-brand hover:bg-brand hover:text-white"
                              : "border-line bg-gray-100 text-gray-400 hover:text-muted"
                          }`}
                        >
                          <IconPhoto size={15} />
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted whitespace-nowrap">
                        {hora(nf.updated_at)}
                      </td>
                    </tr>

                    {aberto && (
                      <tr>
                        <td
                          colSpan={7}
                          className="border-b-2 border-brand bg-surface p-0"
                        >
                          <DetailPanel
                            nf={nf}
                            motoristas={motoristas}
                            onVerFoto={() => setAberta(nf.id)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={7}
                  className="border-t border-line bg-gray-50 px-3 py-2 text-[11px] text-gray-400"
                >
                  {notas.length} ordens no total · mostrando {filtradas.length}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <ComprovanteModal
        nfId={aberta}
        onClose={() => setAberta(null)}
        fetcher={getComprovanteGerencia}
      />
    </>
  );
}

function Linha({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-[11px] text-gray-400">{label}</span>
      <span className="text-xs font-medium text-gray-800">{value}</span>
    </div>
  );
}

function DetailPanel({
  nf,
  motoristas,
  onVerFoto,
}: {
  nf: NotaRow;
  motoristas: MotoristaItem[];
  onVerFoto: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [motoristaId, setMotoristaId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const podeTrocar = !NF_STATUS_FINAIS.includes(nf.status);

  function trocar() {
    if (!motoristaId) return;
    setMsg(null);
    start(async () => {
      const res = await trocarMotorista({ nfId: nf.id, motoristaId });
      if (res.error) setMsg(res.error);
      else {
        setMotoristaId("");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 p-5 sm:flex-row">
      <div className="flex-1 space-y-1.5">
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand">
          <IconUser size={13} /> Detalhes da entrega
        </div>
        <Linha label="Nota fiscal" value={`NF ${nf.numero_nf}`} />
        {nf.empresa_nome && (
          <Linha label="Empresa cliente" value={nf.empresa_nome} />
        )}
        <Linha label="Destinatário" value={nf.destinatario_nome} />
        <Linha
          label="Endereço"
          value={`${nf.destinatario_endereco}${nf.cidade ? `, ${nf.cidade}` : ""}`}
        />
        <Linha
          label="Motorista"
          value={nf.motorista_nome ?? "Não atribuído"}
        />
        <Linha label="Status" value={<StatusBadge status={nf.status} />} />
        <Linha label="Data de entrega" value={nf.data_entrega} />
        {isNotaParada(nf) && (
          <Linha
            label="Atenção"
            value={
              <span className="flex items-center gap-1 font-semibold text-danger">
                <IconClockExclamation size={13} />
                Parada há {diasParada(nf.data_entrega)} dias sem desfecho
              </span>
            }
          />
        )}
        <Linha label="Última atualização" value={hora(nf.updated_at)} />

        {podeTrocar && motoristas.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <IconArrowsExchange size={14} className="text-muted" />
            <select
              value={motoristaId}
              onChange={(e) => setMotoristaId(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-brand"
            >
              <option value="">— trocar motorista —</option>
              {motoristas
                .filter((m) => m.id !== nf.motorista_id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome ?? m.email}
                  </option>
                ))}
            </select>
            <Button
              onClick={trocar}
              disabled={!motoristaId || pending}
              className="px-2.5 py-1.5 text-xs"
            >
              {pending ? "Trocando…" : "Confirmar troca"}
            </Button>
            {msg && <span className="text-xs text-danger">{msg}</span>}
          </div>
        )}

        <LocalizacaoBlock nf={nf} />
      </div>

      <div className="sm:w-52">
        <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand">
          <IconCamera size={13} /> Foto do canhoto
        </div>
        <button
          onClick={onVerFoto}
          className={`flex h-28 w-full flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed text-xs font-medium ${
            nf.foto_url
              ? "border-brand bg-brand-50 text-brand"
              : "border-line bg-gray-50 text-gray-400"
          }`}
        >
          <IconPhoto size={26} />
          {nf.foto_url ? "Ver foto" : "Sem foto ainda"}
        </button>
      </div>
    </div>
  );
}

// Estado da geocodificação do endereço + jeito de recuperar quando falha —
// sem isso, uma NF com endereço mal escrito ficava invisível no mapa pra
// sempre, sem a gerência nem saber o motivo.
function LocalizacaoBlock({ nf }: { nf: NotaRow }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pending, start] = useTransition();
  const [endereco, setEndereco] = useState(nf.destinatario_endereco);
  const [cidade, setCidade] = useState(nf.cidade ?? "");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function tentarEndereco() {
    setMsg(null);
    start(async () => {
      const res = await corrigirEnderecoEGeocodificar({ nfId: nf.id, endereco, cidade });
      setMsg(res.error ?? res.ok ?? null);
      if (!res.error) {
        setAberto(false);
        router.refresh();
      }
    });
  }

  function salvarManual() {
    setMsg(null);
    const latNum = Number(lat.replace(",", "."));
    const lngNum = Number(lng.replace(",", "."));
    start(async () => {
      const res = await definirCoordenadaManual({ nfId: nf.id, lat: latNum, lng: lngNum });
      setMsg(res.error ?? res.ok ?? null);
      if (!res.error) {
        setAberto(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-3 border-t border-line pt-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        {nf.geocode_status === "ok" ? (
          <span className="flex items-center gap-1.5 text-muted">
            <IconMapPin size={14} className="text-brand" /> Localização no mapa OK
          </span>
        ) : nf.geocode_status === "falhou" ? (
          <span className="flex items-center gap-1.5 text-danger">
            <IconMapPinOff size={14} />
            {nf.geocode_erro ?? "Não foi possível localizar este endereço no mapa."}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-gray-400">
            <IconMapPinOff size={14} /> Ainda não geocodificado
          </span>
        )}
        <button
          onClick={() => setAberto((v) => !v)}
          className="shrink-0 font-medium text-brand hover:underline"
        >
          {aberto ? "fechar" : "corrigir"}
        </button>
      </div>

      {aberto && (
        <div className="mt-2.5 space-y-2.5 rounded-lg bg-canvas p-2.5">
          <div className="space-y-1.5">
            <input
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Endereço"
              className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
            />
            <div className="flex gap-1.5">
              <input
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Cidade"
                className="w-full rounded-md border border-line bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
              />
              <Button
                onClick={tentarEndereco}
                disabled={pending || !endereco.trim()}
                className="shrink-0 px-2.5 py-1.5 text-xs"
              >
                Tentar geocodificar
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 border-t border-line pt-2.5">
            <span className="shrink-0 text-[11px] text-gray-400">
              ou coordenada manual:
            </span>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="lat"
              inputMode="decimal"
              className="w-20 rounded-md border border-line bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
            />
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="lng"
              inputMode="decimal"
              className="w-20 rounded-md border border-line bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
            />
            <Button
              onClick={salvarManual}
              disabled={pending || !lat.trim() || !lng.trim()}
              className="shrink-0 px-2.5 py-1.5 text-xs"
            >
              Salvar
            </Button>
          </div>

          {msg && <p className="text-[11px] text-danger">{msg}</p>}
        </div>
      )}
    </div>
  );
}
