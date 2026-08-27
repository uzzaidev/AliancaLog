# Encaminhamentos — reunião de 27/08 (Vítor + Luis)

> Ata gerada automaticamente do áudio da live de 27/08 15h06. Índice geral:
> [README.md](./README.md).
>
> ⚠️ **A própria ata avisa que a transcrição está incompleta** (~34 min de áudio,
> ~1580 palavras). Confirme os pontos abaixo antes de tratar como definitivos —
> vários itens podem ter perdido contexto.

---

## ✅ D-003 — resolvido em 27/08 (migration `0022`)

O Vítor decidiu, e é melhor do que as duas leituras que estavam na mesa: **separar
"voltar ao painel" de "o que aconteceu"**, que estavam colapsados no mesmo campo.

| Status | Significado agora |
|---|---|
| `pendente` | nunca foi tentada |
| `em_rota` | está com o motorista agora |
| `ocorrencia` | tentada, deu problema — **precisa de nova tentativa** |
| `recusada` | tentada, cliente recusou — **precisa de tratativa** |
| `aceita` | **único** status final |

O que faz isso funcionar sem reabrir o problema que o A-007 fechou: **"voltar ao painel"
nunca dependeu do status** — depende de `romaneio_id` e `motorista_id` ficarem nulos.
O status era só o rótulo. Então a nota volta para reatribuição *e* mostra o desfecho.

`ocorrencia` e `recusada` entraram em `NF_STATUS_ABERTOS` (`lib/types.ts`), ou seja,
seguem contando como "a fazer" em todo lugar: painel, mapa, KPI "Em aberto", alerta de
+7 dias e cache offline. Como tudo deriva dessa constante, o alcance foi pequeno.

**Verificado:** `test:security` 14/14 (T8b agora confere o desfecho e T8b2, novo, confere
que a NF realmente saiu do romaneio e do motorista), typecheck, lint e build verdes.

**Sem backfill de volta, de propósito:** a `0016` já tinha normalizado para `pendente`
as notas presas em recusada/ocorrência. Não dá para saber hoje quais eram "nunca
tentada" e quais eram "deu problema" — reconstruir isso arriscaria rotular errado. As
antigas seguem `pendente`; daqui pra frente o status conta a história certa.

> ⚠️ **Efeito colateral a observar no piloto:** uma nota `recusada` que ninguém for
> re-tentar (mercadoria volta ao remetente) agora fica no painel como "a fazer" para
> sempre, e vai disparar o alerta de +7 dias. Se isso incomodar na operação, o caminho
> é a Fase B — "devolvida ao embarcador" como status terminal —, não voltar atrás aqui.

### Histórico: o conflito que existia (D-003 × A-007)

| | O que diz |
|---|---|
| **A-007**, decidido pelo Vítor em 12/08 e **já em produção** (migration `0016`) | Toda nota não aceita **volta ao painel como `pendente`**, desatribuída, pronta para nova tentativa |
| **D-003**, desta reunião | *"Quando houver ocorrência, o status deve refletir 'ocorrência' (não permanecer como pendente)"* |

O que foi observado no teste — *"a nota voltou como pendente na gerência"* — **não é
bug: é exatamente o A-007 funcionando**. O status de desfecho deixou de morar na NF e
passou a viver em `canhotos.status`, uma linha por tentativa.

**Não dá para simplesmente voltar a gravar `ocorrencia` na NF**, porque:
- `fecharRomaneio` trata só `aceita` como final — a NF travaria o romaneio para sempre;
- a NF não voltaria a ficar disponível para reatribuição, que era o ponto do A-007;
- a migration `0016` inclui backfill que normalizou justamente esses estados presos.

**A leitura provável do que o time realmente quer:** não perder de vista *o que
aconteceu*. Hoje a gerência vê "pendente" e não sabe que houve uma ocorrência.

Minha proposta na hora foi um remendo de UI (`Pendente · última tentativa: ...`),
mantendo o status achatado. **O Vítor propôs melhor** — resolver no modelo, dando um
significado único a cada status. Ver o bloco resolvido acima.

---

## Itens já resolvidos antes desta ata ser processada

| Item da ata | Situação real |
|---|---|
| **A-005** — corrigir travamento do fluxo de ocorrência (Teste 1/2) | ✅ **Corrigido em 27/08** — eram duas falhas de RLS (migrations `0020` e `0021`). Detalhe em [luis-fernando-boff.md](./luis-fernando-boff.md) |
| **A-001 / A-002** — extração de `.zip` na gerência | ✅ Implementado (A-003 da ata de 12/08). Falta só **executar o teste** com pacote real |
| **A-003** — corrigir endereço quando o mapa não encontra | ✅ Já existe na UI: bloco "Localização" no painel de detalhe permite corrigir o endereço, tentar de novo ou informar lat/lng manual (migration `0019`) |
| **A-008** — remoção em massa de duplicadas no cliente final | 🟡 **Revalidar.** O botão "Remover N duplicadas" está no bloco compartilhado do `ImportWizard` — aparece **nos dois perfis**. E o bug "removi uma e as outras desmarcaram" foi corrigido no commit `acdf603`. Provavelmente a reunião testou um deploy anterior |

> Sobre a A-008: se a queixa for sobre a **tabela do dashboard** (marcar/excluir
> duplicadas já importadas, do A-004), aí sim é gerência-only **por decisão** — vale
> confirmar se o cliente final deve poder excluir NFs que já entraram no sistema.

---

## Luis

- **A-005 (feito)** — falta a revisão dele nas migrations `0020`/`0021`, que mexem em RLS.
- **A-009** — motorista não apareceu no mapa da gerência (Teste 7). Investigar
  sincronização. Contexto útil: a camada de motoristas **assina o Realtime por conta
  própria** e só mostra quem tem romaneio `ativo` **e** `confirmado_em` preenchido; um
  motorista que não confirmou o recebimento não aparece **por design**. Verificar
  primeiro se era esse o caso antes de procurar bug.
- **500 travando a fila offline** — pendência nova, registrada em
  [luis-fernando-boff.md](./luis-fernando-boff.md).

## Vítor

- **A-002** — rodar o teste do `.zip` com pacote real de carga fechada.
- **A-006** — reteste offline da ocorrência, **agora que o travamento foi corrigido**.
- **A-007 (da ata)** — Testes 3 e 4, depois dos anteriores.
- **A-010** — teste de localização no navegador do celular.
- **A-004** — falar com o Matheus sobre geolocalização/qualidade de endereço.
- **A-011** — acessos/chaves da integração do acelerador.
- **Decidir o conflito D-003 × A-007** (bloco no topo deste arquivo).

---

## Riscos que valem atenção

- **R-002 — "a autenticação falhou de novo"** durante o teste. Não foi investigado
  ainda e não aparece em nenhum outro registro. Se voltar a acontecer, capturar o
  print/horário: pode ser expiração de sessão, mas pode ser algo no proxy de rotas.
- **R-001 — transcrição incompleta.** Itens desta ata podem estar faltando ou
  distorcidos; a própria ferramenta sinalizou. Vale conferir a gravação nos pontos
  críticos antes de fechar escopo.

## Fora do escopo do produto

**A-011 / D-006 (Teófilo Piquet, dados do acelerador)** — integração de telemetria que
não está no PLAN.md nem no contrato. Antes de virar trabalho de engenharia, precisa ser
dimensionada e decidida comercialmente pelo Vítor.
