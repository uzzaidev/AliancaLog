"use client";

// Faixa de clientes (empresas embarcadoras) no dashboard. Clicar num card abre
// a lista das NFs daquele cliente AGRUPADAS POR CIDADE (número da NF, cliente
// final e cidade) — pedido do cliente para priorizar a roteirização.
//
// NFs "aguardando" (soltas, sem romaneio) podem ser marcadas e atribuídas a um
// motorista direto por aqui — alternativa ao bipar fisicamente, para quando a
// gerência já sabe de antemão quem vai levar aquela cidade/lote.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, StatusBadge } from "@/components/ui";
import { atribuirMotorista } from "@/app/gerencia/dashboard/actions";
import type { EmpresaPainel, MotoristaItem } from "@/lib/data/gerencia";

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

// Cor determinística pela razão social — dá identidade sem precisar de logo.
function hue(nome: string) {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) % 360;
  return h;
}

export function EmpresasPainel({
  empresas,
  motoristas,
}: {
  empresas: EmpresaPainel[];
  motoristas: MotoristaItem[];
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [motoristaId, setMotoristaId] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [pending, start] = useTransition();

  if (empresas.length === 0) return null;
  const sel = empresas.find((e) => e.id === aberta) ?? null;

  function abrirEmpresa(id: string, active: boolean) {
    setAberta(active ? null : id);
    setSelecionadas(new Set());
    setMsg(null);
  }

  function toggleNf(id: string) {
    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCidade(ids: string[]) {
    setSelecionadas((prev) => {
      const todasMarcadas = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      for (const id of ids) {
        if (todasMarcadas) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function atribuir() {
    setMsg(null);
    if (!motoristaId) return setMsg({ tipo: "erro", texto: "Selecione o motorista." });
    const nfIds = Array.from(selecionadas);
    start(async () => {
      const res = await atribuirMotorista({ nfIds, motoristaId });
      if (res.error) setMsg({ tipo: "erro", texto: res.error });
      else {
        setMsg({ tipo: "ok", texto: res.ok ?? "Atribuído." });
        setSelecionadas(new Set());
        setMotoristaId("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted">
        Clientes de hoje ({empresas.length})
      </h2>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {empresas.map((e) => {
          const active = e.id === aberta;
          return (
            <button
              key={e.id}
              onClick={() => abrirEmpresa(e.id, active)}
              aria-pressed={active}
              className={`flex min-w-[200px] items-center gap-3 rounded-xl border p-3 text-left transition ${
                active
                  ? "border-brand bg-brand-50"
                  : "border-line bg-surface hover:bg-canvas"
              }`}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: `hsl(${hue(e.nome)} 52% 45%)` }}
              >
                {iniciais(e.nome)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink">
                  {e.nome}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  {e.total} NF{e.total !== 1 ? "s" : ""}
                  {e.aguardando > 0 && (
                    <span className="rounded-full bg-warning-50 px-1.5 py-0.5 font-medium text-warning">
                      {e.aguardando} aguardando
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {sel && (
        <Card className="divide-y divide-line">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="font-semibold text-ink">{sel.nome}</span>
            <span className="text-xs text-muted">
              {sel.total} NF(s) · {sel.aguardando} aguardando bipagem
            </span>
          </div>
          {sel.cidades.map((c) => {
            const idsAguardando = c.notas.filter((n) => n.aguardando).map((n) => n.id);
            const cidadeTodaMarcada =
              idsAguardando.length > 0 && idsAguardando.every((id) => selecionadas.has(id));
            return (
              <div key={c.cidade}>
                <div className="flex items-center gap-2 bg-canvas px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  {idsAguardando.length > 0 ? (
                    <label className="flex cursor-pointer items-center gap-1.5 normal-case">
                      <input
                        type="checkbox"
                        checked={cidadeTodaMarcada}
                        onChange={() => toggleCidade(idsAguardando)}
                        className="h-3.5 w-3.5"
                      />
                      <span aria-hidden>📍</span>
                    </label>
                  ) : (
                    <span aria-hidden>📍</span>
                  )}
                  {c.cidade}
                  <span className="font-normal normal-case opacity-70">
                    ({c.notas.length})
                  </span>
                </div>
                {c.notas.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {n.aguardando && (
                        <input
                          type="checkbox"
                          checked={selecionadas.has(n.id)}
                          onChange={() => toggleNf(n.id)}
                          className="h-4 w-4 shrink-0"
                          aria-label={`Selecionar NF ${n.numero_nf}`}
                        />
                      )}
                      <div className="min-w-0">
                        <span className="font-medium text-ink">
                          NF {n.numero_nf}
                        </span>
                        <span className="text-muted"> · {n.destinatario_nome}</span>
                      </div>
                    </div>
                    <StatusBadge status={n.status} />
                  </div>
                ))}
              </div>
            );
          })}

          {selecionadas.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-brand-50 px-4 py-3">
              <span className="text-sm font-medium text-ink">
                {selecionadas.size} NF(s) selecionada(s) ·
              </span>
              <select
                value={motoristaId}
                onChange={(e) => setMotoristaId(e.target.value)}
                className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand"
              >
                <option value="">— selecione o motorista —</option>
                {motoristas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome ?? m.email}
                  </option>
                ))}
              </select>
              <Button onClick={atribuir} disabled={pending} className="px-3 py-1.5 text-sm">
                {pending ? "Atribuindo…" : "Atribuir motorista"}
              </Button>
              <button
                onClick={() => setSelecionadas(new Set())}
                className="text-xs text-muted hover:text-ink"
              >
                limpar seleção
              </button>
            </div>
          )}

          {msg && (
            <p
              className={`px-4 py-2.5 text-sm ${
                msg.tipo === "ok" ? "text-success" : "text-danger"
              }`}
            >
              {msg.texto}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
