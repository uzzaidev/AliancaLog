# 13 — Integrações e Custo

## Integrações externas

| Integração | Uso | Evidência | Gratuita/Paga |
|---|---|---|---|
| **Supabase** | Postgres + Auth + Realtime + Storage — o backend inteiro | `lib/supabase/*.ts`, todas as migrations | Tem tier gratuito; plano real do projeto **não verificável no código** |
| **Sentry** | Error tracking + session replay | `@sentry/nextjs`, `sentry.*.config.ts` | Tem tier gratuito; ativo só se `NEXT_PUBLIC_SENTRY_DSN` estiver configurada no ambiente |
| **Nominatim (OpenStreetMap)** | Geocodificação de endereço → lat/lng | `lib/geocode.ts` | **Gratuito** — mas com política de uso estrita: 1 req/s, "best-effort" (documentado no código); é por isso que `geocodificarPendentes()` processa em lotes de 15 |
| **Google Maps** | Deep link "Abrir no Maps" no celular do motorista | `lib/maps.ts` | Gratuito — não é a API paga do Google Maps, é só um link `https://maps.google.com/?q=...` |
| **`BarcodeDetector`** (nativo do navegador) + **`@zxing/library`** (fallback) | Scanner de código de barras do DANFE | `components/gerencia/barcode-scanner.tsx` | Gratuito, roda no cliente |
| **SheetJS (`xlsx`)** | Parser de planilha, client-side | `import("xlsx")` sob demanda | Gratuito (via CDN da própria SheetJS, não npm registry) |
| **`pdfjs-dist`** | Extração best-effort de DANFE em PDF | `lib/import-nf.ts`, `public/pdf.worker.min.mjs` | Gratuito (Mozilla) |
| **`fflate`** | Descompactar `.zip` de XMLs em lote | `components/gerencia/import-wizard.tsx` | Gratuito |
| **Vercel** (inferido) | Deploy/hosting | Ver `03_BUILD_RUNBOOK.md` — não confirmado no código | Tier gratuito existe; HTTPS necessário para câmera/SW |

## O que NÃO existe

- Gateway de pagamento (Stripe, PayPal, etc.) — o produto não processa pagamento
- Envio de email/SMS transacional (SendGrid, Twilio, etc.) — nenhuma notificação por email/SMS encontrada no código
- CDN de imagem dedicado — fotos ficam no Storage do próprio Supabase
- Fila/mensageria externa (Redis, SQS) — ver `11_OFFLINE_SYNC_PIPELINE_FROM_CODE.md`
- Analytics de produto (Mixpanel, Amplitude, PostHog, Google Analytics) — não encontrado

## Custo

**Não há tracking de custo no código** — nenhuma métrica de billing, nenhum contador de "requisições gastas", nenhum limite configurável de uso de API paga. Isso é esperado: nenhuma das integrações usadas cobra por chamada individual de forma que o produto precisaria rastrear (Nominatim é gratuito com rate limit próprio, não com cobrança por request; Google Maps aqui é só um deep link, não a API faturável).

**Onde o custo real do projeto está, então:** nos planos de Supabase/Vercel/Sentry contratados — nenhum dos três é determinável a partir deste repositório (são decisões de conta/billing, não de código). Se o volume de uso crescer (mais NFs, mais fotos no Storage, mais chamadas Realtime simultâneas), o primeiro lugar que provavelmente sentiria isso é o **Storage do Supabase** (2 fotos por tentativa de entrega, ~300-400KB cada após compressão) — não há política de expiração/arquivamento de fotos antigas encontrada no código.

## Perguntas em aberto

1. Qual plano do Supabase está em uso hoje, e qual o teto de armazenamento/linhas antes de precisar upgrade?
2. Existe alguma retenção/expiração planejada para fotos antigas no bucket `canhotos`, ou elas ficam para sempre?
