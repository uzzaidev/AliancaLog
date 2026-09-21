"use client";

// Ajudante do dia (migration 0032). Sem cadastro, sem login — é só um nome que
// o motorista registra no próprio romaneio. Os "conhecidos" abaixo são atalho
// de toque (vieram de MOTORISTAS.docx, 21/09); a lista cresce por texto livre,
// não precisa manutenção de cadastro para um ajudante novo aparecer.
import { useState, useTransition } from "react";
import { IconUserPlus, IconUsers } from "@tabler/icons-react";
import { Button, Input } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { definirAjudante } from "@/app/motorista/actions";

const AJUDANTES_CONHECIDOS = [
  "Juan Franco",
  "Erik Faleiro",
  "Adriano Benhur",
  "Marcos Vaz",
];

export function AjudanteButton({
  romaneioId,
  ajudanteAtual,
}: {
  romaneioId: string;
  ajudanteAtual: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(ajudanteAtual ?? "");
  const [salvo, setSalvo] = useState(ajudanteAtual);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function salvar() {
    start(async () => {
      setErro(null);
      const r = await definirAjudante(romaneioId, nome);
      if (r.error) return setErro(r.error);
      setSalvo(r.ajudante ?? null);
      setAberto(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setNome(salvo ?? "");
          setErro(null);
          setAberto(true);
        }}
        className="flex touch-target w-full items-center gap-2 rounded-lg border border-dashed border-line px-3 text-sm font-medium text-muted active:bg-canvas"
      >
        {salvo ? (
          <>
            <IconUsers size={17} className="shrink-0 text-brand" />
            <span className="min-w-0 flex-1 truncate text-left text-ink">
              Ajudante: <span className="font-semibold">{salvo}</span>
            </span>
          </>
        ) : (
          <>
            <IconUserPlus size={17} className="shrink-0" />
            <span className="flex-1 text-left">Registrar ajudante do dia</span>
          </>
        )}
      </button>

      <Modal open={aberto} onClose={() => setAberto(false)} title="Ajudante do dia">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Alguém foi com você hoje? Não precisa de cadastro — só o nome.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {AJUDANTES_CONHECIDOS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNome(n)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  nome === n
                    ? "bg-brand text-white"
                    : "bg-canvas text-ink ring-1 ring-inset ring-line hover:bg-brand-50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              Nome do ajudante
            </span>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Juan Franco"
            />
          </label>

          {erro && (
            <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
              {erro}
            </p>
          )}

          <div className="flex justify-end gap-2">
            {salvo && (
              <Button
                variant="secondary"
                onClick={() => {
                  setNome("");
                  start(async () => {
                    setErro(null);
                    const r = await definirAjudante(romaneioId, "");
                    if (r.error) return setErro(r.error);
                    setSalvo(null);
                    setAberto(false);
                  });
                }}
                disabled={pending}
              >
                Remover
              </Button>
            )}
            <Button onClick={salvar} disabled={pending || !nome.trim()}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
