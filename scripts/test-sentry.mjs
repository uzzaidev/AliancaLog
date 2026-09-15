// Teste de conexão direta HTTP com o Sentry usando a DSN configurada
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (!dsn) {
  console.error("❌ Nenhuma DSN encontrada!");
  process.exit(1);
}

// Parse da DSN
const url = new URL(dsn);
const publicKey = url.username;
const projectId = url.pathname.replace(/^\//, "");
const ingestHost = url.host;

console.log("→ Chave pública:", publicKey);
console.log("→ Projeto ID:", projectId);
console.log("→ Host:", ingestHost);

const endpoint = `https://${ingestHost}/api/${projectId}/envelope/`;
import { randomBytes } from "crypto";
const eventId = randomBytes(16).toString("hex");
const timestamp = Math.floor(Date.now() / 1000);

const header = JSON.stringify({
  event_id: eventId,
  sent_at: new Date().toISOString(),
  dsn: dsn,
});

const itemHeader = JSON.stringify({
  type: "event",
  content_type: "application/json",
});

const itemPayload = JSON.stringify({
  event_id: eventId,
  timestamp: timestamp,
  platform: "javascript",
  level: "info",
  message: "Validação de Conexão Sentry - Aliança Log (Piloto)",
  tags: {
    area: "offline-sync",
    piloto: "true",
    origem: "validacao-cli",
    ambiente: "piloto",
  },
  extra: {
    responsavel: "Luis Boff",
    data: new Date().toISOString(),
  },
});

const body = `${header}\n${itemHeader}\n${itemPayload}\n`;

console.log("→ Enviando evento de teste para o Sentry...");

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-sentry-envelope",
    "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=custom-test/1.0, sentry_key=${publicKey}`,
  },
  body: body,
});

console.log("Status HTTP:", response.status, response.statusText);
const resText = await response.text();
if (response.ok) {
  console.log(`✅ Sucesso total! Event ID: ${eventId}`);
  console.log("O evento foi aceito e registrado pelos servidores do Sentry.");
  console.log("Acesse: https://uzzai-9c.sentry.io/issues/ para conferir!");
} else {
  console.error("❌ Resposta do Sentry:", resText);
}
