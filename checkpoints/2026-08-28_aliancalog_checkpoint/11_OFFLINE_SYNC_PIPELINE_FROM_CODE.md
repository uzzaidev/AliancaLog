# 11 — Pipeline de Sincronização Offline

> **Nota de adaptação:** no template original (projeto videomaker), o arquivo nesta posição é
> `11_WORKER_PIPELINE_FROM_CODE.md` — uma fila de workers processando jobs em background. O Aliança Log
> **não tem** worker nem fila de infraestrutura (nenhum Redis/BullMQ/Sidekiq, ver `01_STACK_DETECTION.md`).
> O análogo estrutural mais próximo — o único lugar do sistema onde um trabalho é enfileirado, sobrevive
> a interrupção, e é processado de forma assíncrona e idempotente — é a **fila offline do motorista**.
> Documentado aqui, no mesmo lugar da numeração, para quem já conhece o template reconhecer o paralelo.

## Por que existe

O motorista está em campo, com rede instável ou ausente, e precisa poder registrar uma entrega mesmo
sem sinal. A entrega não pode ficar perdida no processo — se o app fechar, o celular desligar, ou a rede
cair no meio de um envio, o registro precisa sobreviver e ser reenviado sem duplicar.

## As 5 etapas do pipeline

```
1. UI                 canhoto-form.tsx — motorista tira 2 fotos + escolhe status
2. Compressão         lib/offline/image.ts — canvas, ~1280px, JPEG 0.8 (assinatura legível)
3. Enfileiramento     lib/offline/queue.ts — grava no IndexedDB (client_id gerado no device)
4. Sincronização      lib/offline/sync.ts — tenta enviar quando online, para no 1º erro de rede
5. Persistência       app/api/sync/route.ts → RPC registrar_entrega_offline (banco)
```

### 1–2. Captura e compressão (`components/motorista/canhoto-form.tsx`, `lib/offline/image.ts`)

Foto via `<input capture>` (câmera nativa do celular, não upload de galeria — força foto tirada na hora). `comprimirImagem()` reduz para no máximo 1280px no maior lado, JPEG qualidade 0.8, ~300-400KB — grande o bastante para a assinatura ficar legível no zoom (o comentário no código é explícito: "não reduzir sem testar isso"), pequeno o bastante para subir em rede móvel ruim.

### 3. Fila (`lib/offline/queue.ts`, `lib/offline/db.ts`)

IndexedDB com 2 object stores: `fila_canhotos` (keyPath `client_id`) e `cache_notas` (keyPath `key`, cache de romaneios/NFs para a tela funcionar sem rede desde que já tenha sido aberta uma vez). O `client_id` é gerado **no device**, não no servidor — é isso que torna toda a cadeia idempotente: reenviar o mesmo item nunca cria um registro duplicado, porque o servidor (e o banco) reconhecem o mesmo `client_id`.

Foto é armazenada como `Blob` — sobrevive ao IndexedDB sem serialização especial.

### 4. Disparo da sincronização (`lib/offline/sync.ts`)

Não é um worker/daemon separado — é uma função chamada de múltiplos gatilhos no próprio app:
- ao montar `sync-banner.tsx`
- ao voltar a conexão (`online` event)
- a cada 30s (polling leve enquanto o app está aberto)
- ao reabrir o app

**Comportamento importante:** para no **primeiro** item que falhar por rede (não por erro de servidor) — `rodando` é uma flag módulo-level que evita rodadas concorrentes. Um evento DOM customizado (`EVENTO_FILA`) avisa os componentes React quando a fila muda, para o banner/UI atualizar sem prop drilling nem polling de estado.

**Risco documentado (achado nesta sessão, ver `18_KNOWN_ISSUES_AND_RISKS.md`):** um erro de **servidor** (500 permanente, diferente de "sem rede") também interrompe o loop — e como a fila é processada em ordem, um item travado bloqueia todos os que vêm depois dele. Foi exatamente o padrão dos dois bugs de RLS documentados em `10_RLS_AND_SECURITY.md` (a fila "travava" inteira por causa de UM item malformado).

### 5. Persistência no servidor (`app/api/sync/route.ts`)

Único endpoint HTTP do sistema (ver `06_ROUTES_FROM_CODE.md` sobre por que é rota e não Server Action). Sequência dentro do handler:

1. Autentica via cookie de sessão (não é chamada anônima)
2. Confere `role === 'motorista'`
3. Saída rápida de idempotência: se o `client_id` já existe em `canhotos`, responde `409 { already: true }` — a fila trata isso como sucesso e remove o item (esta é só uma otimização; a checagem definitiva de verdade está dentro da RPC)
4. Sobe as **duas fotos em paralelo** (`Promise.all`) — canhoto e chegada não dependem uma da outra
5. Chama a RPC `registrar_entrega_offline` — 1 transação de banco (canhoto + NF + ocorrência), ver `09_DATABASE_SCHEMA_FROM_MIGRATIONS.md`

**Sem `upsert` no Storage, de propósito:** o path da foto é derivado do `client_id` (`{motorista_id}/{nf_id}/{client_id}.jpg`), então um reenvio cai exatamente no mesmo arquivo — um erro "already exists" no upload é tratado como sucesso, não como falha. Isso existe porque `upsert: true` exigiria permissão de `UPDATE` no Storage, que o motorista não tem (canhoto é imutável por design, ver `10_RLS_AND_SECURITY.md`).

## Garantias que este pipeline oferece (e como cada uma é alcançada)

| Garantia | Mecanismo |
|---|---|
| Não perde o registro se a rede cair | Persistido no IndexedDB **antes** de qualquer tentativa de rede |
| Reenvio não duplica | `client_id` único de ponta a ponta — IndexedDB → `/api/sync` → índice único no Postgres |
| Nunca fica "canhoto sem NF atualizada" | Transação atômica na RPC (migration 0011) |
| Sobrevive a fechar/reabrir o app | Fila é IndexedDB, não estado de memória React |
| Abre o app sem rede | Service Worker (`public/sw.js`) cacheia o app shell |

## O que este pipeline explicitamente NÃO faz

- **Não é offline-first completo** — se a aba nunca foi aberta com rede, o app não abre do zero sem conexão (só funciona offline "a partir de" um estado já carregado). Risco já registrado no `docs/governanca/CHECKPOINT.md` histórico, confirmado aqui.
- **Não tem retry com backoff exponencial** — é tentativa simples, disparada pelos 4 gatilhos acima
- **Não tem fila de prioridade** — é estritamente sequencial (FIFO), o que é a causa do "um item travado bloqueia todos" citado acima
