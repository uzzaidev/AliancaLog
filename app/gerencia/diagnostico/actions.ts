"use server";

import * as Sentry from "@sentry/nextjs";
import { requireRole } from "@/lib/auth/dal";

export type TestResult = {
  ok: boolean;
  eventId?: string;
  dsnConfigurada: boolean;
  mensagem: string;
};

export async function dispararErroServidorSentry(): Promise<TestResult> {
  await requireRole("gerencia");

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  const dsnConfigurada = !!dsn;

  const erro = new Error("Teste controlado do piloto: erro de servidor simulado (Aliança Log)");
  const eventId = Sentry.captureException(erro, {
    level: "error",
    tags: {
      area: "offline-sync",
      origem: "diagnostico-gerencia",
      ambiente: process.env.NODE_ENV || "production",
      piloto: "true",
    },
    extra: {
      timestamp: new Date().toISOString(),
      detalhe: "Disparo manual feito pelo painel de diagnóstico para validar recebimento no Sentry.",
    },
  });

  return {
    ok: true,
    eventId: eventId || undefined,
    dsnConfigurada,
    mensagem: dsnConfigurada
      ? `Evento disparado com sucesso! Event ID: ${eventId}. Verifique no painel do Sentry.`
      : "Atenção: A variável NEXT_PUBLIC_SENTRY_DSN não está configurada no servidor. O evento não pôde ser enviado externamente.",
  };
}

