# 17 — Diagramas de Arquitetura

Ver também: diagrama ER completo em `09_DATABASE_SCHEMA_FROM_MIGRATIONS.md`, sequência de login em `12_AUTH_AND_AUTHZ.md`. Este arquivo cobre os 3 diagramas que não couberam nos anteriores.

## 1. Arquitetura geral do sistema

```mermaid
graph TB
  subgraph Client["Navegador / PWA"]
    GER[Gerencia - Server Components]
    MOT[Motorista - Server Components + SW]
    CLI[Cliente final - Server Components]
    SW[Service Worker + IndexedDB]
  end

  subgraph Edge["proxy.ts"]
    PROXY[Roteamento otimista por role do JWT]
  end

  subgraph Server["Next.js Server"]
    DAL[lib/auth/dal.ts - requireRole/requireUser]
    ACTIONS[Server Actions - mutacoes]
    DATA["lib/data/*.ts - leituras"]
    SYNC["/api/sync - unico endpoint HTTP"]
  end

  subgraph Supabase["Supabase - sa-east-1"]
    AUTH[Auth - JWT com role/empresa_id]
    RLS[(Postgres + RLS - camada real de autorizacao)]
    STORAGE[Storage - bucket canhotos privado]
    REALTIME[Realtime]
  end

  subgraph External["Externos"]
    SENTRY[Sentry]
    NOMINATIM[Nominatim - geocoding]
  end

  MOT -->|fila offline| SW
  SW -->|POST quando online| SYNC
  GER --> PROXY
  MOT --> PROXY
  CLI --> PROXY
  PROXY --> DAL
  DAL --> ACTIONS
  DAL --> DATA
  ACTIONS --> RLS
  DATA --> RLS
  SYNC --> RLS
  AUTH --> RLS
  RLS --> STORAGE
  RLS -.push.-> REALTIME
  REALTIME -.atualiza.-> GER
  ACTIONS --> SENTRY
  ACTIONS --> NOMINATIM
```

## 2. Sequência: registro de entrega, do celular ao banco

O caminho mais percorrido do sistema — e o que teve os 2 bugs de RLS documentados em `10_RLS_AND_SECURITY.md`.

```mermaid
sequenceDiagram
  participant M as Motorista (canhoto-form)
  participant Q as IndexedDB (queue.ts)
  participant S as sync.ts
  participant API as /api/sync
  participant RPC as registrar_entrega_offline (Postgres)

  M->>Q: grava tentativa (client_id gerado no device, foto como Blob)
  Note over Q: sobrevive a fechar o app / perder conexao
  S->>Q: le pendentes (gatilho: online, boot, 30s, manual)
  S->>API: POST FormData (client_id, nf_id, status, 2 fotos, GPS)
  API->>API: autentica sessao, confere role=motorista
  API->>API: checagem rapida de idempotencia (SELECT client_id)
  alt ja existe
    API-->>S: 409 already=true
    S->>Q: remove da fila (trata como sucesso)
  else novo
    API->>API: upload das 2 fotos em paralelo (Storage)
    API->>RPC: chama com todos os parametros
    RPC->>RPC: INSERT canhoto (ON CONFLICT client_id DO NOTHING)
    RPC->>RPC: INSERT ocorrencia SE status=ocorrencia (antes do UPDATE abaixo)
    RPC->>RPC: UPDATE notas_fiscais (status real, zera romaneio/motorista se nao aceita)
    Note over RPC: tudo em UMA transacao - migration 0011
    RPC-->>API: ja_existia=false
    API-->>S: 200 ok
    S->>Q: remove da fila, dispara EVENTO_FILA
  end
```

## 3. Máquina de estados de uma NF (`NotaStatus`)

O comportamento mudou 2 vezes de forma consequente (migrations 0016 e 0022) — vale visualizar o estado atual explicitamente, porque a intuição "recusada/ocorrência = final" (comum em outros sistemas de entrega) é **errada** neste projeto desde a A-007.

```mermaid
stateDiagram-v2
  [*] --> pendente: NF importada (Excel/XML/PDF)
  pendente --> em_rota: gerencia atribui a um romaneio ativo + motorista confirma recebimento
  em_rota --> aceita: motorista registra canhoto, status=aceita
  em_rota --> recusada: motorista registra canhoto, status=recusada
  em_rota --> ocorrencia: motorista registra canhoto, status=ocorrencia
  recusada --> pendente: volta ao painel (romaneio_id/motorista_id zerados) - nova tentativa possivel
  ocorrencia --> pendente: idem
  aceita --> [*]: UNICO status final (NF_STATUS_FINAIS)

  note right of aceita
    Trigger nf_guard_motorista bloqueia
    qualquer alteracao depois de 'aceita'
  end note

  note right of recusada
    Desde a migration 0022: o status
    mostra o desfecho REAL da tentativa,
    nao mais sempre 'pendente' (isso
    era o comportamento entre 0016 e 0022)
  end note
```

**Nota de leitura:** as transições `recusada --> pendente` e `ocorrencia --> pendente` não significam "o status muda para pendente automaticamente" — significam "a NF fica **disponível para nova tentativa**, e uma nova tentativa começa do zero (nova atribuição de romaneio/motorista), então o próximo ciclo começa em `pendente`". O `status` da NF em si permanece mostrando `recusada`/`ocorrencia` até alguém agir de novo — é assim que a gerência sabe o que aconteceu sem abrir o comprovante.
