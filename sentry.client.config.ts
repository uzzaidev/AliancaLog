import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Ajuste de taxa de amostragem de rastreamento (100% em homologação/piloto)
  tracesSampleRate: 1.0,
  // Replays de sessão para capturar falhas visuais no celular do motorista
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  // Não envia se DSN não estiver configurado
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});

