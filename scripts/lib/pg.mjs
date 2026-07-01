// Helper de conexão ao Postgres do Supabase para os scripts de banco.
// Lê DATABASE_URL (Session pooler) do ambiente — populado por `node --env-file=.env.local`.
import pg from "pg";

export function getConnectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      "Falta DATABASE_URL no .env.local.\n" +
        "Pegue a connection string em: Supabase → Project Settings → Database →\n" +
        "Connection string → 'Session pooler' (porta 5432), e coloque em DATABASE_URL.",
    );
    process.exit(1);
  }
  return url;
}

export function createClient() {
  return new pg.Client({
    connectionString: getConnectionString(),
    // Supabase exige SSL; o pooler usa um cert que não precisamos validar aqui.
    ssl: { rejectUnauthorized: false },
  });
}
