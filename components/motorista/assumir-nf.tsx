"use client";

// Motorista recebe a NF na mão e a assume bipando o DANFE, sem esperar a gerência
// atribuir (migration 0026). Só casa com NF que já existe no sistema — bipar não
// cria nota nova.
import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  IconAlertTriangle,
  IconBarcode,
  IconCircleCheck,
  IconInfoCircle,
  IconMapPin,
  IconSearch,
} from "@tabler/icons-react";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { Button, Card, Input } from "@/components/ui";
import { interpretarCodigoBipado } from "@/lib/nfe";
import { assumirNf, type NfAssumida } from "@/app/motorista/actions";

export function AssumirNf() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [res, setRes] = useState<NfAssumida | null>(null);
  // Guarda o texto cru que o leitor devolveu. Sem isso, uma bipagem que nao casa
  // vira "nota nao encontrada" sem dizer o que foi lido — indiagnosticavel.
  const [lido, setLido] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Guarda o código da NF que espera confirmação de troca, para rechamar com o
  // mesmo código depois do "tenho certeza".
  const pendenteRef = useRef<string | null>(null);
  // Dedupe do scanner: o BarcodeDetector dispara a cada frame lido.
  const ultimoRef = useRef<{ codigo: string; t: number }>({ codigo: "", t: 0 });
  const ocupadoRef = useRef(false);
  // Leitura sem chave válida precisa aparecer duas vezes seguidas para ser
  // aceita — ver `onScan`.
  const candidatoRef = useRef<string | null>(null);

  const enviar = useCallback((codigo: string, confirmarTroca: boolean) => {
    setLido(codigo);
    ocupadoRef.current = true;
    start(async () => {
      setErro(null);
      const r = await assumirNf(codigo, confirmarTroca);
      ocupadoRef.current = false;
      if (r.error) {
        setErro(r.error);
        return;
      }
      if (!r.dados) return;
      if (r.dados.resultado === "confirmar_troca") pendenteRef.current = codigo;
      else pendenteRef.current = null;
      setRes(r.dados);
      // Fecha a câmera assim que alguma coisa acontece — a tela passa a ser o
      // resultado, e manter o vídeo rodando por baixo só gasta bateria.
      setScanning(false);
      if (r.dados.resultado === "assumida") router.refresh();
    });
  }, [router]);

  const onScan = useCallback(
    (texto: string) => {
      const agora = Date.now();
      if (ocupadoRef.current) return;
      if (texto === ultimoRef.current.codigo && agora - ultimoRef.current.t < 2500)
        return;

      // Leitura de código de barras é instável: o primeiro quadro decodificado
      // costuma vir parcial (em 09/09, um DANFE devolveu "505584" — 6 dígitos de
      // uma chave de 44). Aceitar esse primeiro quadro vira "nota não encontrada"
      // numa nota que existe.
      //
      // Quando o texto vira uma chave de acesso válida, o dígito verificador já
      // atesta a leitura e vale entrar na hora. Sem isso, exige ver o MESMO texto
      // duas vezes seguidas antes de consultar o servidor.
      const { chave } = interpretarCodigoBipado(texto);
      if (!chave && candidatoRef.current !== texto) {
        candidatoRef.current = texto;
        return;
      }

      candidatoRef.current = null;
      ultimoRef.current = { codigo: texto, t: agora };
      enviar(texto, false);
    },
    [enviar],
  );

  function limpar() {
    setRes(null);
    setErro(null);
    pendenteRef.current = null;
    candidatoRef.current = null;
    ultimoRef.current = { codigo: "", t: 0 };
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-dark">Bipar nota</h2>
          <Button
            variant={scanning ? "secondary" : "primary"}
            onClick={() => {
              limpar();
              setScanning((s) => !s);
            }}
          >
            <IconBarcode size={18} />
            {scanning ? "Parar" : "Abrir câmera"}
          </Button>
        </div>

        {scanning && (
          <BarcodeScanner onResult={onScan} onError={(m) => setErro(m)} />
        )}

        <p className="text-xs text-muted">
          Aponte para o código de barras do DANFE. A nota entra direto no seu
          romaneio de hoje.
        </p>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-dark">
          Ou digite o número da NF
        </h2>
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            placeholder="Ex.: 24471"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
          />
          <Button
            variant="secondary"
            disabled={pending || !manual.trim()}
            onClick={() => {
              limpar();
              enviar(manual.trim(), false);
            }}
          >
            <IconSearch size={17} />
          </Button>
        </div>
      </Card>

      {pending && (
        <p className="text-center text-sm text-muted">Procurando a nota…</p>
      )}

      {erro && (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
          {erro}
        </p>
      )}

      {res && <Resultado dados={res} onLimpar={limpar} pending={pending} codigoLido={lido}
        onConfirmarTroca={() => {
          const codigo = pendenteRef.current;
          if (codigo) enviar(codigo, true);
        }}
      />}
    </div>
  );
}

function DadosNf({ dados }: { dados: NfAssumida }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-gray-400">
        NF {dados.numeroNf}
      </div>
      <div className="font-semibold text-dark">{dados.destinatarioNome}</div>
      {dados.empresaNome && (
        <div className="text-sm text-brand">{dados.empresaNome}</div>
      )}
      {dados.destinatarioEndereco && (
        <div className="mt-1 flex items-start gap-1 text-sm text-muted">
          <IconMapPin size={13} className="mt-0.5 shrink-0 text-gray-400" />
          <span>
            {dados.destinatarioEndereco}
            {dados.cidade ? `, ${dados.cidade}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

function Resultado({
  dados,
  codigoLido,
  onLimpar,
  onConfirmarTroca,
  pending,
}: {
  dados: NfAssumida;
  codigoLido: string | null;
  onLimpar: () => void;
  onConfirmarTroca: () => void;
  pending: boolean;
}) {
  const router = useRouter();

  if (dados.resultado === "nao_encontrada") {
    return (
      <Card className="space-y-3 p-4 text-center">
        <IconAlertTriangle size={36} className="mx-auto text-warning" />
        <p className="font-semibold text-dark">Nota não encontrada</p>
        <p className="text-sm text-muted">
          Essa NF ainda não foi importada no sistema. Avise a gerência antes de
          sair com ela.
        </p>
        {codigoLido && (
          <div className="rounded-lg bg-canvas px-3 py-2 text-left">
            <div className="text-[11px] font-medium text-gray-400">
              Código lido · {[...codigoLido].length} caracteres ·{" "}
              {/^\d+$/.test(codigoLido) ? "só dígitos" : "com outros caracteres"}
            </div>
            <div className="break-all font-mono text-xs text-ink">{codigoLido}</div>
            {/* Uma chave de acesso tem 44 dígitos. Leitura curta é quadro
                parcial: o motorista precisa saber que é para tentar de novo,
                não que a nota está faltando no sistema. */}
            {[...codigoLido].length < 44 && (
              <div className="mt-1 text-[11px] text-warning">
                Leitura incompleta — a chave do DANFE tem 44 dígitos. Tente
                bipar de novo, com a câmera mais firme e o código bem iluminado.
              </div>
            )}
          </div>
        )}
        <Button variant="secondary" className="w-full" onClick={onLimpar}>
          Bipar outra
        </Button>
      </Card>
    );
  }

  if (dados.resultado === "finalizada") {
    return (
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-success">
          <IconCircleCheck size={20} />
          <p className="font-semibold">Essa nota já foi entregue</p>
        </div>
        <DadosNf dados={dados} />
        <p className="text-sm text-muted">
          Entrega já registrada e aceita — não dá para assumir de novo.
        </p>
        <Button variant="secondary" className="w-full" onClick={onLimpar}>
          Bipar outra
        </Button>
      </Card>
    );
  }

  if (dados.resultado === "ja_sua") {
    return (
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-info">
          <IconInfoCircle size={20} />
          <p className="font-semibold">Essa nota já é sua</p>
        </div>
        <DadosNf dados={dados} />
        <div className="grid gap-2">
          {dados.romaneioId && (
            <Button
              className="w-full"
              onClick={() => router.push(`/motorista/romaneio/${dados.romaneioId}`)}
            >
              Ver no romaneio
            </Button>
          )}
          <Button variant="secondary" className="w-full" onClick={onLimpar}>
            Bipar outra
          </Button>
        </div>
      </Card>
    );
  }

  if (dados.resultado === "confirmar_troca") {
    return (
      <Card className="space-y-3 border-2 border-warning p-4">
        <div className="flex items-center gap-2 text-warning">
          <IconAlertTriangle size={20} />
          <p className="font-semibold">Essa nota é de outro motorista</p>
        </div>
        <DadosNf dados={dados} />
        <p className="rounded-lg bg-warning-50 px-3 py-2 text-sm text-warning">
          Está atribuída a <strong>{dados.motoristaAnterior ?? "outro motorista"}</strong>.
          Tem certeza que quer assumir? Ela sai do romaneio dele e a gerência vê a
          troca.
        </p>
        <div className="grid gap-2">
          <Button className="w-full" disabled={pending} onClick={onConfirmarTroca}>
            {pending ? "Assumindo…" : "Sim, assumir mesmo assim"}
          </Button>
          <Button variant="secondary" className="w-full" onClick={onLimpar}>
            Cancelar
          </Button>
        </div>
      </Card>
    );
  }

  // assumida
  return (
    <Card className="space-y-3 border-2 border-success p-4">
      <div className="flex items-center gap-2 text-success">
        <IconCircleCheck size={20} />
        <p className="font-semibold">Nota assumida!</p>
      </div>
      <DadosNf dados={dados} />
      {dados.motoristaAnterior && (
        <p className="text-sm text-warning">
          Tirada de {dados.motoristaAnterior}.
        </p>
      )}
      <div className="grid gap-2">
        <Button variant="secondary" className="w-full" onClick={onLimpar}>
          <IconBarcode size={18} /> Bipar a próxima
        </Button>
        {dados.romaneioId && (
          <Button
            className="w-full"
            onClick={() => router.push(`/motorista/romaneio/${dados.romaneioId}`)}
          >
            Ir para minhas entregas
          </Button>
        )}
      </div>
    </Card>
  );
}
