import "server-only";

// Cliente Supabase com a SERVICE ROLE KEY — ignora RLS.
// Uso EXCLUSIVO no servidor para: criar logins (admin.createUser), gerar URLs
// assinadas das fotos de canhoto e operações administrativas. NUNCA expor ao browser.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ausente. Necessária para criar logins e assinar URLs de fotos. Veja .env.example.",
    );
  }
  return createSupabaseClient(supabaseUrl(), serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
