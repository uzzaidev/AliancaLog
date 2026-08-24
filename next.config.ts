import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Desativa logs excessivos no build
  silent: true,
  // Não quebra o build se SENTRY_AUTH_TOKEN não estiver configurado
  telemetry: false,
});

