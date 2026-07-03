# components/ — Componentes React

Componentes organizados por perfil + pasta `ui/` para primitivos compartilhados.

## Pastas

| Pasta | Conteúdo |
|-------|----------|
| `ui/` | Primitivos: `Card`, `Button`, `Badge`, `StatusBadge`, `Spinner`, `Modal` — importados via `@/components/ui` |
| `brand/` | Logo e identidade visual da Aliança Log |
| `gerencia/` | Dashboard, filtros, listas de NFs, romaneio-builder, realtime-refresher, fechar-romaneio-button |
| `motorista/` | Telas de campo: lista de entregas, scanner de código de barras, form de canhoto, sync-banner |
| `cliente/` | Portal do cliente: filtros (status/período/busca) e lista de NFs clicável |

## Componentes compartilhados (root de components/)

- `comprovante-modal.tsx` — Modal de comprovante com foto (URL assinada), timeline e ocorrências.
  Recebe a Server Action `fetcher` como prop — cada área passa a sua versão com `requireRole` embutido.

## Convenções

- Componentes "use client" só quando precisam de hooks ou eventos de browser
- Componentes do motorista: botões ≥ 48px (classe `.touch-target`), 1 ação principal por tela
- Design system: CSS variables via `@theme` (Tailwind v4) — tokens `ink`, `muted`, `canvas`, `brand`, `surface`, `line`, `success`, `danger`
- Não importe `admin.ts` do Supabase em nenhum componente — ele é server-only
