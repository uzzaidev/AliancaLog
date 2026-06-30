// Centraliza a leitura das variáveis de ambiente do Supabase com mensagens claras.
// As chaves são lidas em tempo de execução (não no import) para o build não quebrar sem .env.

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ausente. Copie .env.example para .env.local e preencha com os dados do projeto Supabase (região sa-east-1).",
    );
  }
  return url;
}

export function supabaseAnonKey(): string {
  // Aceita tanto a chave "anon" clássica quanto a nova "publishable" do Supabase.
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY ausente. Veja .env.example.",
    );
  }
  return key;
}
